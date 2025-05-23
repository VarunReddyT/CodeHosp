# Medical RAG System with LLM Integration - Google Colab Setup
# This system stores code/dataset info in vector DB and uses LLM to explain based on queries

# ==================== CELL 1: Setup and Installation ====================


# Mount Google Drive

# Create directory structure in Google Drive
import os
os.makedirs('/content/drive/MyDrive/medical_rag_system', exist_ok=True)
os.makedirs('/content/drive/MyDrive/medical_rag_system/models', exist_ok=True)
os.makedirs('/content/drive/MyDrive/medical_rag_system/data', exist_ok=True)

# ==================== CELL 2: LLM Integration Classes ====================
import os
import ast
import json
import uuid
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple, Any, Union
from dataclasses import dataclass, asdict
from datetime import datetime
import sqlite3
from pathlib import Path
import pickle
import joblib
from abc import ABC, abstractmethod

# Vector database and embeddings
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer

# LLM integration
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document
from langchain.vectorstores import Chroma
from langchain.embeddings import SentenceTransformerEmbeddings

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except:
    GEMINI_AVAILABLE = False

try:
    from transformers import pipeline
    HF_AVAILABLE = True
except:
    HF_AVAILABLE = False

class BaseLLM(ABC):
    """Base class for LLM integrations"""
    
    @abstractmethod
    def generate_response(self, prompt: str, max_tokens: int = 500) -> str:
        pass
    
class GeminiLLM(BaseLLM):
    """Google Gemini integration"""
    
    def __init__(self, api_key: str, model: str = "gemini-pro"):
        if not GEMINI_AVAILABLE:
            raise ImportError("Google Generative AI package not installed")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(model)
    
    def generate_response(self, prompt: str, max_tokens: int = 500) -> str:
        try:
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=max_tokens,
                    temperature=0.7
                )
            )
            return response.text.strip()
        except Exception as e:
            return f"Error generating response: {str(e)}"

@dataclass
class StudyMetadata:
    """Core metadata for a research study"""
    study_id: str
    title: str
    description: str
    uploaded_at: datetime
    file_paths: Dict[str, str]  # {'python': path, 'csv': path}
    user_id: str

@dataclass
class CSVSummary:
    """Comprehensive CSV dataset summary"""
    filename: str
    shape: Tuple[int, int]
    columns: List[str]
    column_types: Dict[str, str]
    numeric_stats: Dict[str, Dict]  # column -> {mean, std, min, max, etc.}
    categorical_stats: Dict[str, Dict]  # column -> {unique_count, top_values}
    missing_values: Dict[str, int]
    sample_rows: List[Dict]
    potential_identifiers: List[str]  # columns that might be patient IDs
    date_columns: List[str]

@dataclass
class PythonAnalysis:
    """Python code analysis results"""
    filename: str
    functions: List[Dict]  # {name, docstring, parameters, returns}
    imports: List[str]
    comments: List[str]
    statistical_methods: List[str]  # detected statistical tests/methods
    data_operations: List[str]  # filtering, grouping, etc.
    visualizations: List[str]  # plot types detected
    variables: List[str]  # important variable names

class MedicalDataProcessor:
    """Processes and extracts information from uploaded files"""
    
    def __init__(self):
        self.statistical_keywords = [
            't-test', 'chi-square', 'anova', 'regression', 'correlation',
            'mann-whitney', 'wilcoxon', 'fisher', 'pearson', 'spearman',
            'kruskal', 'friedman', 'survival', 'kaplan-meier', 'cox'
        ]
        
        self.data_operation_keywords = [
            'filter', 'groupby', 'merge', 'join', 'pivot', 'aggregate',
            'sort', 'drop', 'fillna', 'interpolate', 'resample'
        ]
        
        self.viz_keywords = [
            'plot', 'scatter', 'histogram', 'boxplot', 'barplot',
            'heatmap', 'violin', 'kde', 'distribution'
        ]
    
    def process_csv(self, file_path: str, sample_size: int = 5) -> CSVSummary:
        """Extract comprehensive CSV metadata"""
        df = pd.read_csv(file_path)
        
        # Basic info
        filename = os.path.basename(file_path)
        shape = df.shape
        columns = df.columns.tolist()
        column_types = df.dtypes.astype(str).to_dict()
        
        # Numeric statistics
        numeric_stats = {}
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            stats = df[col].describe()
            numeric_stats[col] = {
                'mean': float(stats['mean']) if not pd.isna(stats['mean']) else None,
                'std': float(stats['std']) if not pd.isna(stats['std']) else None,
                'min': float(stats['min']) if not pd.isna(stats['min']) else None,
                'max': float(stats['max']) if not pd.isna(stats['max']) else None,
                'median': float(df[col].median()) if not pd.isna(df[col].median()) else None,
                'q25': float(stats['25%']) if not pd.isna(stats['25%']) else None,
                'q75': float(stats['75%']) if not pd.isna(stats['75%']) else None
            }
        
        # Categorical statistics
        categorical_stats = {}
        categorical_cols = df.select_dtypes(include=['object', 'category']).columns
        for col in categorical_cols:
            value_counts = df[col].value_counts()
            categorical_stats[col] = {
                'unique_count': int(df[col].nunique()),
                'top_values': value_counts.head(10).to_dict(),
                'most_common': str(value_counts.index[0]) if len(value_counts) > 0 else None
            }
        
        # Missing values
        missing_values = df.isnull().sum().to_dict()
        missing_values = {k: int(v) for k, v in missing_values.items() if v > 0}
        
        # Sample rows
        sample_rows = df.head(sample_size).to_dict('records')
        
        # Detect potential identifiers (high cardinality, unique values)
        potential_identifiers = []
        for col in columns:
            unique_ratio = df[col].nunique() / len(df)
            if unique_ratio > 0.95 or 'id' in col.lower() or 'patient' in col.lower():
                potential_identifiers.append(col)
        
        # Detect date columns
        date_columns = []
        for col in df.columns:
            if df[col].dtype == 'object':
                try:
                    pd.to_datetime(df[col].dropna().head(100))
                    date_columns.append(col)
                except:
                    pass
        
        return CSVSummary(
            filename=filename,
            shape=shape,
            columns=columns,
            column_types=column_types,
            numeric_stats=numeric_stats,
            categorical_stats=categorical_stats,
            missing_values=missing_values,
            sample_rows=sample_rows,
            potential_identifiers=potential_identifiers,
            date_columns=date_columns
        )
    
    def process_python(self, file_path: str) -> PythonAnalysis:
        """Extract comprehensive Python code analysis"""
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        filename = os.path.basename(file_path)
        
        # Parse AST
        tree = ast.parse(content)
        
        # Extract functions
        functions = []
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                func_info = {
                    'name': node.name,
                    'docstring': ast.get_docstring(node) or '',
                    'parameters': [arg.arg for arg in node.args.args],
                    'line_number': node.lineno
                }
                functions.append(func_info)
        
        # Extract imports
        imports = []
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                imports.extend([alias.name for alias in node.names])
            elif isinstance(node, ast.ImportFrom):
                module = node.module or ''
                imports.extend([f"{module}.{alias.name}" for alias in node.names])
        
        # Extract comments
        comments = []
        lines = content.split('\n')
        for i, line in enumerate(lines):
            stripped = line.strip()
            if stripped.startswith('#'):
                comments.append({
                    'line': i + 1,
                    'text': stripped[1:].strip()
                })
        
        # Detect statistical methods
        content_lower = content.lower()
        statistical_methods = []
        for method in self.statistical_keywords:
            if method in content_lower:
                statistical_methods.append(method)
        
        # Detect data operations
        data_operations = []
        for operation in self.data_operation_keywords:
            if operation in content_lower:
                data_operations.append(operation)
        
        # Detect visualizations
        visualizations = []
        for viz in self.viz_keywords:
            if viz in content_lower:
                visualizations.append(viz)
        
        # Extract important variables (assignments to DataFrames, etc.)
        variables = []
        for node in ast.walk(tree):
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name):
                        variables.append(target.id)
        
        return PythonAnalysis(
            filename=filename,
            functions=functions,
            imports=imports,
            comments=[c['text'] for c in comments],
            statistical_methods=statistical_methods,
            data_operations=data_operations,
            visualizations=visualizations,
            variables=variables[:20]  # Limit to avoid noise
        )

class MedicalRAGSystem:
    """Complete RAG system with LLM integration for medical research queries"""
    
    def __init__(self, 
                 base_path: str = "/content/drive/MyDrive/medical_rag_system",
                 embedding_model: str = "all-MiniLM-L6-v2",
                 llm: Optional[BaseLLM] = None):
        
        self.base_path = base_path
        self.chroma_path = os.path.join(base_path, "chroma_db")
        self.processor = MedicalDataProcessor()
        
        # Initialize embeddings
        self.embeddings = SentenceTransformerEmbeddings(model_name=embedding_model)
        self.embedding_model_name = embedding_model
        
        # Initialize vector store
        os.makedirs(self.chroma_path, exist_ok=True)
        self.vectorstore = Chroma(
            persist_directory=self.chroma_path,
            embedding_function=self.embeddings,
            collection_name="medical_studies"
        )
        
        # Initialize LLM
        self.llm = llm
        
        # Initialize metadata database
        self.init_metadata_db()
        
        # Text splitter for chunking
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separators=["\n\n", "\n", ".", "!", "?", ",", " ", ""]
        )
    
    def set_llm(self, llm: BaseLLM):
        """Set or change the LLM"""
        self.llm = llm
    
    def init_metadata_db(self):
        """Initialize SQLite database for study metadata"""
        self.db_path = os.path.join(self.chroma_path, "studies.db")
        
        conn = sqlite3.connect(self.db_path)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS studies (
                study_id TEXT PRIMARY KEY,
                title TEXT,
                description TEXT,
                uploaded_at TEXT,
                file_paths TEXT,
                user_id TEXT,
                csv_summary TEXT,
                python_analysis TEXT
            )
        """)
        conn.commit()
        conn.close()
    
    def ingest_study(self, 
                    python_file: str,
                    csv_file: str,
                    title: str,
                    description: str,
                    user_id: str) -> str:
        """Complete study ingestion pipeline"""
        
        # Generate unique study ID
        study_id = str(uuid.uuid4())
        
        # Process files
        csv_summary = self.processor.process_csv(csv_file)
        python_analysis = self.processor.process_python(python_file)
        
        # Create study metadata
        study_metadata = StudyMetadata(
            study_id=study_id,
            title=title,
            description=description,
            uploaded_at=datetime.now(),
            file_paths={'python': python_file, 'csv': csv_file},
            user_id=user_id
        )
        
        # Create document chunks for embedding
        documents = self._create_document_chunks(
            study_metadata, csv_summary, python_analysis
        )
        
        # Add to vector store
        self.vectorstore.add_documents(documents)
        self.vectorstore.persist()  # Persist to disk
        
        # Store metadata in database
        self._store_metadata(study_metadata, csv_summary, python_analysis)
        
        return study_id
    
    def _create_document_chunks(self, 
                              study_metadata: StudyMetadata,
                              csv_summary: CSVSummary,
                              python_analysis: PythonAnalysis) -> List[Document]:
        """Create embeddings-ready document chunks"""
        
        documents = []
        
        # 1. Study overview chunk
        overview_text = f"""
        Study: {study_metadata.title}
        Description: {study_metadata.description}
        Study ID: {study_metadata.study_id}
        User: {study_metadata.user_id}
        Uploaded: {study_metadata.uploaded_at}
        """
        
        documents.append(Document(
            page_content=overview_text,
            metadata={
                "study_id": study_metadata.study_id,
                "chunk_type": "overview",
                "title": study_metadata.title
            }
        ))
        
        # 2. Dataset summary chunks
        dataset_text = f"""
        Dataset Information:
        Filename: {csv_summary.filename}
        Dataset Shape: {csv_summary.shape[0]} rows and {csv_summary.shape[1]} columns
        
        Columns in Dataset: {', '.join(csv_summary.columns)}
        
        Column Data Types:
        {json.dumps(csv_summary.column_types, indent=2)}
        
        Numeric Columns Statistical Summary:
        {json.dumps(csv_summary.numeric_stats, indent=2)}
        
        Categorical Columns Summary:
        {json.dumps(csv_summary.categorical_stats, indent=2)}
        
        Missing Values Analysis:
        {json.dumps(csv_summary.missing_values, indent=2)}
        
        Potential Patient Identifiers: {', '.join(csv_summary.potential_identifiers)}
        Date Columns Detected: {', '.join(csv_summary.date_columns)}
        
        Sample Data Rows:
        {json.dumps(csv_summary.sample_rows, indent=2)}
        """
        
        # Split large dataset descriptions
        dataset_chunks = self.text_splitter.split_text(dataset_text)
        for i, chunk in enumerate(dataset_chunks):
            documents.append(Document(
                page_content=chunk,
                metadata={
                    "study_id": study_metadata.study_id,
                    "chunk_type": "dataset",
                    "chunk_index": i,
                    "filename": csv_summary.filename
                }
            ))
        
        # 3. Python code analysis chunks
        code_text = f"""
        Python Analysis Script Information:
        Script Filename: {python_analysis.filename}
        
        Functions Defined in Code:
        {json.dumps(python_analysis.functions, indent=2)}
        
        Libraries and Imports Used: {', '.join(python_analysis.imports)}
        
        Statistical Methods Detected: {', '.join(python_analysis.statistical_methods)}
        
        Data Operations Performed: {', '.join(python_analysis.data_operations)}
        
        Visualization Types Created: {', '.join(python_analysis.visualizations)}
        
        Important Variables: {', '.join(python_analysis.variables)}
        
        Code Comments and Documentation:
        {chr(10).join(python_analysis.comments)}
        """
        
        code_chunks = self.text_splitter.split_text(code_text)
        for i, chunk in enumerate(code_chunks):
            documents.append(Document(
                page_content=chunk,
                metadata={
                    "study_id": study_metadata.study_id,
                    "chunk_type": "code_analysis",
                    "chunk_index": i,
                    "filename": python_analysis.filename
                }
            ))
        
        # 4. Individual function chunks (for detailed code questions)
        for func in python_analysis.functions:
            func_text = f"""
            Function Details:
            Function Name: {func['name']}
            Function Parameters: {', '.join(func['parameters'])}
            Function Documentation/Docstring: {func['docstring']}
            Line Number: {func.get('line_number', 'Unknown')}
            
            This function is part of the analysis script: {python_analysis.filename}
            """
            
            documents.append(Document(
                page_content=func_text,
                metadata={
                    "study_id": study_metadata.study_id,
                    "chunk_type": "function",
                    "function_name": func['name'],
                    "filename": python_analysis.filename
                }
            ))
        
        return documents
    
    def _store_metadata(self, 
                       study_metadata: StudyMetadata,
                       csv_summary: CSVSummary,
                       python_analysis: PythonAnalysis):
        """Store study metadata in SQLite database"""
        
        conn = sqlite3.connect(self.db_path)
        conn.execute("""
            INSERT INTO studies 
            (study_id, title, description, uploaded_at, file_paths, user_id, csv_summary, python_analysis)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            study_metadata.study_id,
            study_metadata.title,
            study_metadata.description,
            study_metadata.uploaded_at.isoformat(),
            json.dumps(study_metadata.file_paths),
            study_metadata.user_id,
            json.dumps(asdict(csv_summary)),
            json.dumps(asdict(python_analysis))
        ))
        conn.commit()
        conn.close()
    
    def query_study(self, 
                   question: str, 
                   study_id: Optional[str] = None,
                   top_k: int = 5) -> Dict:
        """Query the RAG system with LLM-generated explanations"""
        
        # Step 1: Retrieve relevant context from vector database
        search_kwargs = {"k": top_k}
        if study_id:
            search_kwargs["filter"] = {"study_id": study_id}
        
        retriever = self.vectorstore.as_retriever(search_kwargs=search_kwargs)
        relevant_docs = retriever.get_relevant_documents(question)
        
        # Step 2: Prepare context for LLM
        context = "\n\n".join([
            f"Source {i+1}:\n{doc.page_content}" 
            for i, doc in enumerate(relevant_docs)
        ])
        
        # Step 3: Create prompt for LLM
        prompt = f"""You are a medical research assistant. Based on the following context retrieved from a medical research database, please answer the user's question.

Context from Research Database:
{context}

User Question: {question}

Instructions:
- Use only the information provided in the context
- Be specific about statistical methods, dataset characteristics, and code functionality
- If discussing patient data, maintain appropriate medical/clinical language
- Cite specific functions, variables, or statistical tests when relevant
- If the context doesn't contain enough information to answer the question, state that clearly
- Focus on providing accurate, detailed explanations based on the retrieved information

Answer:"""
        
        # Step 4: Generate response using LLM
        llm_response = self.llm.generate_response(prompt, max_tokens=500)
        
        # Step 5: Return comprehensive result
        return {
            "question": question,
            "answer": llm_response,
            "context_used": context,
            "source_documents": [
                {
                    "content": doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content,
                    "metadata": doc.metadata,
                    "chunk_type": doc.metadata.get("chunk_type", "unknown")
                }
                for doc in relevant_docs
            ],
            "num_sources": len(relevant_docs),
            "study_id_filter": study_id
        }
    
    def list_studies(self, user_id: Optional[str] = None) -> List[Dict]:
        """List all studies or studies for a specific user"""
        
        conn = sqlite3.connect(self.db_path)
        
        if user_id:
            cursor = conn.execute(
                "SELECT study_id, title, description, uploaded_at FROM studies WHERE user_id = ?",
                (user_id,)
            )
        else:
            cursor = conn.execute(
                "SELECT study_id, title, description, uploaded_at FROM studies"
            )
        
        studies = []
        for row in cursor.fetchall():
            studies.append({
                "study_id": row[0],
                "title": row[1],
                "description": row[2],
                "uploaded_at": row[3]
            })
        
        conn.close()
        return studies
    
    def get_study_details(self, study_id: str) -> Optional[Dict]:
        """Get detailed information about a specific study"""
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.execute(
            "SELECT * FROM studies WHERE study_id = ?",
            (study_id,)
        )
        
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return None
        
        return {
            "study_id": row[0],
            "title": row[1],
            "description": row[2],
            "uploaded_at": row[3],
            "file_paths": json.loads(row[4]),
            "user_id": row[5],
            "csv_summary": json.loads(row[6]),
            "python_analysis": json.loads(row[7])
        }
    
    def save_model(self):
        """Save the RAG system state"""
        model_info = {
            "embedding_model_name": self.embedding_model_name,
            "base_path": self.base_path,
            "chroma_path": self.chroma_path,
            "db_path": self.db_path,
            "llm_type": type(self.llm).__name__,
            "saved_at": datetime.now().isoformat()
        }
        
        # Save model configuration
        with open(os.path.join(self.base_path, "model_config.json"), "w") as f:
            json.dump(model_info, f, indent=2)
        
        # Save the processor
        with open(os.path.join(self.base_path, "processor.pkl"), "wb") as f:
            pickle.dump(self.processor, f)
        
        print(f"Model saved to {self.base_path}")
        return model_info
    
    @classmethod
    def load_model(cls, base_path: str = "/content/drive/MyDrive/medical_rag_system", llm: Optional[BaseLLM] = None):
        """Load a saved RAG system"""
        
        # Load model configuration
        with open(os.path.join(base_path, "model_config.json"), "r") as f:
            model_info = json.load(f)
        
        # Create instance
        instance = cls(
            base_path=base_path,
            embedding_model=model_info["embedding_model_name"],
            llm=llm
        )
        
        # Load the processor
        with open(os.path.join(base_path, "processor.pkl"), "rb") as f:
            instance.processor = pickle.load(f)
        
        print(f"Model loaded from {base_path}")
        return instance

# ==================== CELL 3: Create Sample Data for Testing ====================

# Create sample CSV data
sample_csv_data = """patient_id,age,gender,bmi,vitamin_d,blood_pressure,diabetes,cholesterol
P001,45,M,28.5,25.3,140/90,0,220
P002,52,F,31.2,18.7,150/95,1,280
P003,38,M,24.1,32.8,120/80,0,180
P004,61,F,29.8,15.2,160/100,1,320
P005,33,M,22.3,28.9,110/70,0,160
P006,47,F,35.6,12.4,170/110,1,340
P007,29,M,26.7,30.1,125/85,0,190
P008,55,F,28.9,19.8,145/92,1,290
P009,42,M,25.4,26.7,135/88,0,200
P010,36,F,30.2,21.5,155/98,1,250"""

# Create sample Python analysis code
sample_python_code = '''
import pandas as pd
import numpy as np
from scipy import stats
import matplotlib.pyplot as plt
import seaborn as sns

# Load patient data for BMI and Vitamin D correlation study
df = pd.read_csv("patient_data.csv")

def analyze_bmi_vitamin_correlation():
    """
    Analyze correlation between BMI and Vitamin D levels in patients
    Uses Pearson correlation coefficient
    Returns correlation coefficient and p-value for statistical significance
    """
    # Filter out missing values for clean analysis
    df_clean = df.dropna(subset=["bmi", "vitamin_d"])
    correlation, p_value = stats.pearsonr(df_clean["bmi"], df_clean["vitamin_d"])
    return correlation, p_value
def plot_bmi_distribution():
    """ 
    Plot distribution of BMI values in the dataset
    """
    plt.figure(figsize=(10, 6))
    sns.histplot(df["bmi"], bins=20, kde=True)
    plt.title("BMI Distribution")
    plt.xlabel("BMI")
    plt.ylabel("Frequency")
    plt.show()
def plot_vitamin_d_distribution():
    """

    Plot distribution of Vitamin D levels in the dataset
    """
    plt.figure(figsize=(10, 6))
    sns.histplot(df["vitamin_d"], bins=20, kde=True)
    plt.title("Vitamin D Distribution")
    plt.xlabel("Vitamin D Level")
    plt.ylabel("Frequency")
    plt.show()
def main():
    # Perform analysis and plot distributions
    correlation, p_value = analyze_bmi_vitamin_correlation()
    print(f"Correlation between BMI and Vitamin D: {correlation}, p-value: {p_value}")
    plot_bmi_distribution()
    plot_vitamin_d_distribution()
if __name__ == "__main__":
    main()
'''
# Save sample data to files
with open('/content/drive/MyDrive/medical_rag_system/data/sample_data.csv', 'w') as f:
    f.write(sample_csv_data)
with open('/content/drive/MyDrive/medical_rag_system/data/sample_analysis.py', 'w') as f:
    f.write(sample_python_code)
# ==================== CELL 4: Initialize and Test the RAG System ====================
# Initialize the RAG system
rag_system = MedicalRAGSystem(
    base_path='/content/drive/MyDrive/medical_rag_system',
    embedding_model='all-MiniLM-L6-v2',
    llm=GeminiLLM(apikey= "YOUR_GEMINI_API_KEY")
)
# Ingest sample study
study_id = rag_system.ingest_study(
    python_file='/content/drive/MyDrive/medical_rag_system/data/sample_analysis.py',
    csv_file='/content/drive/MyDrive/medical_rag_system/data/sample_data.csv',
    title='BMI and Vitamin D Correlation Study',
    description='A study analyzing the correlation between BMI and Vitamin D levels in patients.',
    user_id='user_123'
)
print(f"Study ingested with ID: {study_id}")
# Query the system
query_result = rag_system.query_study(
    question="What statistical methods were used in the analysis?",
    study_id=study_id
)
print("Query Result:")
print(json.dumps(query_result, indent=2))
# List all studies
studies = rag_system.list_studies()
print("All Studies:")
print(json.dumps(studies, indent=2))
# Get details of a specific study
study_details = rag_system.get_study_details(study_id)
print("Study Details:")
print(json.dumps(study_details, indent=2))
# Save the model state
model_info = rag_system.save_model()
print("Model saved with info:")
print(json.dumps(model_info, indent=2))
# Load the model
loaded_rag_system = MedicalRAGSystem.load_model(
    base_path='/content/drive/MyDrive/medical_rag_system',
    llm=GeminiLLM(apikey= "YOUR_GEMINI_API_KEY")
)
print("Loaded RAG system:")
print(json.dumps(loaded_rag_system.save_model(), indent=2))