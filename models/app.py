import os
import ast
import pandas as pd
import numpy as np
from sentence_transformers import SentenceTransformer
# from deepdiff import DeepDiff
from typing import Union, Dict, Tuple, List

class ScientificReproducibilityChecker:
    """Complete solution for validating and comparing research outputs"""
    
    def __init__(self, numeric_tolerance: float = 1e-6):
        # Validation parameters (★ = strict requirements)
        self.validation_rules = {
            'allowed_formats': ['.csv', '.xlsx', '.py'],  # ★ Updated formats
            'max_file_size_mb': 5,                      # ★
            'delimiters': [',', '\t'],                    # ★ For CSV files
            'forbidden_header_chars': ['#', '@'],         # ★ For CSV/Excel headers
            'min_columns': 1                              # ★ For data files
        }
        
        # Comparison parameters
        self.numeric_tolerance = numeric_tolerance
        self.text_model = SentenceTransformer('all-MiniLM-L6-v2')
    
    def validate_file(self, file_path: str) -> Tuple[bool, Dict]:
        """Validates a research file against submission guidelines"""
        report = {
            'valid': False,
            'errors': [],
            'warnings': [],
            'columns': [],
            'file_type': None,
            'metadata': {}
        }
        
        try:
            # ★ Format check
            file_ext = os.path.splitext(file_path)[1].lower()
            if file_ext not in self.validation_rules['allowed_formats']:
                report['errors'].append(
                    f"★ Invalid format. Allowed: {self.validation_rules['allowed_formats']}"
                )
                return (False, report)
            report['file_type'] = file_ext
            
            # ★ Size check
            file_size = os.path.getsize(file_path) / (1024 * 1024)
            if file_size > self.validation_rules['max_file_size_mb']:
                report['errors'].append(
                    f"★ File size exceeds {self.validation_rules['max_file_size_mb']}MB"
                )
                return (False, report)
            
            # ★ Structure validation by file type
            if file_ext == '.csv':
                return self._validate_csv(file_path, report)
            elif file_ext == '.xlsx':
                return self._validate_xlsx(file_path, report)
            elif file_ext == '.py':
                return self._validate_python(file_path, report)
            
        except Exception as e:
            report['errors'].append(f"★ Validation error: {str(e)}")
        
        report['valid'] = len(report['errors']) == 0
        return (report['valid'], report)
    
    def _validate_csv(self, file_path: str, report: Dict) -> Tuple[bool, Dict]:
        """Specialized CSV validation"""
        try:
            # ★ Delimiter detection
            with open(file_path, 'r', encoding='utf-8') as f:
                first_line = f.readline()
            
            delim = self._detect_delimiter(first_line)
            if delim not in self.validation_rules['delimiters']:
                report['errors'].append(
                    f"★ Invalid delimiter '{delim}'. Use: {self.validation_rules['delimiters']}"
                )
                return (False, report)
            
            # Load sample for structure checks
            df = pd.read_csv(file_path, delimiter=delim, nrows=10)
            
            # ★ Column checks
            if len(df.columns) < self.validation_rules['min_columns']:
                report['errors'].append(
                    f"★ Minimum {self.validation_rules['min_columns']} column required"
                )
            
            # ★ Header checks
            for col in df.columns:
                col_str = str(col)
                if any(c in col_str for c in self.validation_rules['forbidden_header_chars']):
                    report['errors'].append(
                        f"★ Header '{col_str}' contains forbidden character"
                    )
                if any(word in col_str.lower() for word in ['merged', 'combined']):
                    report['warnings'].append(
                        f"Potential merged cells in column: {col_str}"
                    )
            
            # Content checks
            if df.empty:
                report['errors'].append("★ Empty file")
            elif len(df) == 1:
                report['warnings'].append("Only header row detected - no data rows")
            
            report['columns'] = df.columns.tolist()
            report['metadata'] = {
                'delimiter': delim,
                'shape': df.shape,
                'dtypes': df.dtypes.to_dict()
            }
            
        except pd.errors.EmptyDataError:
            report['errors'].append("★ Empty file")
        except UnicodeDecodeError:
            report['errors'].append("★ Encoding error - use UTF-8")
        except Exception as e:
            report['errors'].append(f"★ CSV parsing error: {str(e)}")
        
        report['valid'] = len(report['errors']) == 0
        return (report['valid'], report)
    
    def _validate_xlsx(self, file_path: str, report: Dict) -> Tuple[bool, Dict]:
        """Specialized Excel validation"""
        try:
            # Load Excel file
            xl_file = pd.ExcelFile(file_path)
            
            # Check number of sheets
            if len(xl_file.sheet_names) == 0:
                report['errors'].append("★ No sheets found in Excel file")
                return (False, report)
            
            # Validate first sheet (main data)
            first_sheet = xl_file.sheet_names[0]
            df = pd.read_excel(file_path, sheet_name=first_sheet, nrows=10)
            
            # ★ Column checks
            if len(df.columns) < self.validation_rules['min_columns']:
                report['errors'].append(
                    f"★ Minimum {self.validation_rules['min_columns']} column required"
                )
            
            # ★ Header checks
            for col in df.columns:
                col_str = str(col)
                if any(c in col_str for c in self.validation_rules['forbidden_header_chars']):
                    report['errors'].append(
                        f"★ Header '{col_str}' contains forbidden character"
                    )
                if 'unnamed' in col_str.lower():
                    report['warnings'].append(
                        f"Potential unnamed column: {col_str}"
                    )
            
            # Content checks
            if df.empty:
                report['errors'].append("★ Empty file")
            elif len(df) == 1:
                report['warnings'].append("Only header row detected - no data rows")
            
            # Multiple sheets warning
            if len(xl_file.sheet_names) > 1:
                report['warnings'].append(
                    f"Multiple sheets detected: {xl_file.sheet_names}. Only first sheet will be compared."
                )
            
            report['columns'] = df.columns.tolist()
            report['metadata'] = {
                'sheets': xl_file.sheet_names,
                'main_sheet': first_sheet,
                'shape': df.shape,
                'dtypes': df.dtypes.to_dict()
            }
            
        except Exception as e:
            report['errors'].append(f"★ Excel parsing error: {str(e)}")
        
        report['valid'] = len(report['errors']) == 0
        return (report['valid'], report)
    
    def _validate_python(self, file_path: str, report: Dict) -> Tuple[bool, Dict]:
        """Specialized Python file validation"""
        try:
            # Read file content
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Check if file is empty
            if not content.strip():
                report['errors'].append("★ Empty Python file")
                return (False, report)
            
            # Try to parse as valid Python syntax
            try:
                parsed = ast.parse(content)
                report['metadata']['syntax_valid'] = True
            except SyntaxError as e:
                report['errors'].append(f"★ Python syntax error: {str(e)}")
                return (False, report)
            
            # Analyze structure
            functions = []
            classes = []
            imports = []
            
            for node in ast.walk(parsed):
                if isinstance(node, ast.FunctionDef):
                    functions.append(node.name)
                elif isinstance(node, ast.ClassDef):
                    classes.append(node.name)
                elif isinstance(node, (ast.Import, ast.ImportFrom)):
                    if isinstance(node, ast.Import):
                        imports.extend([alias.name for alias in node.names])
                    else:
                        imports.append(node.module)
            
            # Warnings for potential issues
            if not functions and not classes:
                report['warnings'].append("No functions or classes defined")
            
            if 'main' not in content.lower():
                report['warnings'].append("No main block detected")
            
            # Check for common scientific libraries
            scientific_libs = ['numpy', 'pandas', 'matplotlib', 'scipy', 'sklearn']
            used_libs = [lib for lib in scientific_libs if any(lib in imp for imp in imports if imp)]
            
            report['metadata'] = {
                'functions': functions,
                'classes': classes,
                'imports': imports,
                'scientific_libraries': used_libs,
                'line_count': content.count('\n') + 1
            }
            
        except UnicodeDecodeError:
            report['errors'].append("★ Encoding error - use UTF-8")
        except Exception as e:
            report['errors'].append(f"★ Python file validation error: {str(e)}")
        
        report['valid'] = len(report['errors']) == 0
        return (report['valid'], report)
    
    def _detect_delimiter(self, sample: str) -> str:
        """Auto-detects most likely delimiter"""
        delims = self.validation_rules['delimiters'] + [';']
        counts = {d: sample.count(d) for d in delims}
        return max(counts.items(), key=lambda x: x[1])[0]
    
    def compare_outputs(
        self,
        expected_path: str,
        actual_path: str
    ) -> Tuple[float, Dict]:
        """Main comparison function after validation"""
        expected = self._load_file(expected_path)
        actual = self._load_file(actual_path)
        
        # Get file extensions
        expected_ext = os.path.splitext(expected_path)[1].lower()
        actual_ext = os.path.splitext(actual_path)[1].lower()
        
        # Type compatibility check
        if expected_ext != actual_ext:
            return 0.0, {"error": f"File type mismatch: {expected_ext} vs {actual_ext}"}
        
        # Dispatch to appropriate comparator
        if isinstance(expected, pd.DataFrame):
            return self._compare_dataframes(expected, actual)
        elif isinstance(expected, str) and expected_ext == '.py':
            return self._compare_python_files(expected, actual)
        else:
            return self._compare_scalars(expected, actual)
    
    def _load_file(self, file_path: str) -> Union[pd.DataFrame, str]:
        """Loads validated files with proper error handling"""
        ext = os.path.splitext(file_path)[1].lower()
        
        try:
            if ext == '.csv':
                return pd.read_csv(file_path)
            elif ext == '.xlsx':
                return pd.read_excel(file_path)
            elif ext == '.py':
                with open(file_path, 'r', encoding='utf-8') as f:
                    return f.read()
            else:
                raise ValueError(f"Unsupported format: {ext}")
        except Exception as e:
            raise ValueError(f"Failed to load {file_path}: {str(e)}")
    
    def _compare_dataframes(self, df_expected: pd.DataFrame, df_actual: pd.DataFrame) -> Tuple[float, Dict]:
        """Detailed DataFrame comparison"""
        results = {
            "score_components": {},
            "differences": []
        }
        
        # 1. Shape check
        if df_expected.shape != df_actual.shape:
            results["differences"].append(
                f"Shape mismatch: expected {df_expected.shape}, got {df_actual.shape}"
            )
            return 0.0, results
        
        # 2. Column checks
        missing_cols = set(df_expected.columns) - set(df_actual.columns)
        extra_cols = set(df_actual.columns) - set(df_expected.columns)
        
        if missing_cols:
            results["differences"].append(f"Missing columns: {missing_cols}")
        if extra_cols:
            results["differences"].append(f"Extra columns: {extra_cols}")
        
        # 3. Numeric comparison
        numeric_score = 1.0
        numeric_cols = df_expected.select_dtypes(include=np.number).columns
        for col in numeric_cols:
            if col in df_actual.columns:
                close = np.isclose(
                    df_expected[col],
                    df_actual[col],
                    atol=self.numeric_tolerance,
                    equal_nan=True
                )
                col_score = close.mean()
                numeric_score *= col_score
                if col_score < 1.0:
                    diff = (df_expected[col] - df_actual[col]).abs().max()
                    results["differences"].append(
                        f"Numeric deviation in '{col}': max difference {diff:.2e}"
                    )
        
        # 4. Text comparison
        text_score = 1.0
        text_cols = df_expected.select_dtypes(include='object').columns
        for col in text_cols:
            if col in df_actual.columns:
                emb_expected = self.text_model.encode(
                    df_expected[col].astype(str).tolist()
                )
                emb_actual = self.text_model.encode(
                    df_actual[col].astype(str).tolist()
                )
                similarities = np.diag(emb_expected @ emb_actual.T)
                col_score = similarities.mean()
                text_score *= col_score
                if col_score < 0.99:
                    results["differences"].append(
                        f"Text difference in '{col}': similarity {col_score:.2f}"
                    )
        
        # Composite score
        final_score = 0.7 * numeric_score + 0.3 * text_score
        results["score_components"] = {
            "numeric_score": numeric_score,
            "text_score": text_score
        }
        
        return final_score, results
    
    def _compare_python_files(self, expected_code: str, actual_code: str) -> Tuple[float, Dict]:
        """Compare Python code files"""
        results = {
            "score_components": {},
            "differences": []
        }
        
        # 1. Exact match check
        if expected_code.strip() == actual_code.strip():
            return 1.0, {"differences": []}
        
        # 2. AST-based comparison (structure)
        try:
            expected_ast = ast.parse(expected_code)
            actual_ast = ast.parse(actual_code)
            
            # Compare AST structure
            expected_dump = ast.dump(expected_ast, annotate_fields=False)
            actual_dump = ast.dump(actual_ast, annotate_fields=False)
            
            if expected_dump == actual_dump:
                structural_score = 1.0
                results["differences"].append("Code structure identical (whitespace/comments differ)")
            else:
                # Count structural differences
                structural_score = 0.8  # Penalize structural differences
                results["differences"].append("Code structure differs")
        
        except SyntaxError:
            structural_score = 0.0
            results["differences"].append("Syntax error in one or both files")
        
        # 3. Text similarity
        emb_expected = self.text_model.encode([expected_code])
        emb_actual = self.text_model.encode([actual_code])
        text_similarity = float(emb_expected @ emb_actual.T)
        
        # 4. Line-by-line comparison
        expected_lines = expected_code.strip().split('\n')
        actual_lines = actual_code.strip().split('\n')
        
        if len(expected_lines) != len(actual_lines):
            results["differences"].append(
                f"Line count differs: {len(expected_lines)} vs {len(actual_lines)}"
            )
        
        # Composite score for code
        final_score = 0.6 * structural_score + 0.4 * text_similarity
        results["score_components"] = {
            "structural_score": structural_score,
            "text_similarity": text_similarity
        }
        
        return final_score, results
    
    def _compare_scalars(self, expected, actual) -> Tuple[float, Dict]:
        """Simple scalar value comparison"""
        if isinstance(expected, (float, np.floating)) and isinstance(actual, (float, np.floating)):
            if np.isclose(expected, actual, atol=self.numeric_tolerance):
                return 1.0, {"differences": []}
            return 0.0, {
                "differences": [
                    f"Numeric difference: {expected} vs {actual}",
                    f"Absolute difference: {abs(expected - actual):.2e}"
                ]
            }
        else:
            match = expected == actual
            return (1.0 if match else 0.0), {
                "differences": [] if match else ["Scalar value mismatch"]
            }
    
    def generate_report(self, validation: Dict, comparison: Dict) -> str:
        """Generates complete validation + comparison report"""
        report = [
            "=== SCIENTIFIC REPRODUCIBILITY REPORT ===",
            "\n[VALIDATION SUMMARY]"
        ]
        
        # Validation section
        for file_type in ['expected', 'actual']:
            report.append(f"\n{file_type.upper()} FILE:")
            if validation[file_type]['valid']:
                report.append("✅ Passed all checks")
                report.append(f"File type: {validation[file_type]['file_type']}")
                
                # Add metadata based on file type
                metadata = validation[file_type]['metadata']
                if validation[file_type]['file_type'] in ['.csv', '.xlsx']:
                    report.append(f"Columns: {validation[file_type]['columns']}")
                    if 'shape' in metadata:
                        report.append(f"Shape: {metadata['shape']}")
                elif validation[file_type]['file_type'] == '.py':
                    report.append(f"Functions: {len(metadata.get('functions', []))}")
                    report.append(f"Classes: {len(metadata.get('classes', []))}")
                    report.append(f"Lines: {metadata.get('line_count', 0)}")
            else:
                report.append("❌ Validation failed:")
                for error in validation[file_type]['errors']:
                    report.append(f"- {error}")
                for warning in validation[file_type]['warnings']:
                    report.append(f"! {warning}")
        
        # Comparison section
        if all(v['valid'] for v in validation.values()):
            report.append("\n[COMPARISON RESULTS]")
            report.append(f"\nReproducibility Score: {comparison['score']:.2f}/1.00")
            
            if comparison['details'].get('differences'):
                report.append("\nDifferences found:")
                for diff in comparison['details']['differences']:
                    report.append(f"- {diff}")
            else:
                report.append("\n✅ Perfect match - fully reproducible!")
            
            if comparison['details'].get('score_components'):
                report.append("\nScore Components:")
                for k, v in comparison['details']['score_components'].items():
                    report.append(f"- {k}: {v:.2f}")
        
        return "\n".join(report)
    
    def process_study(self, expected_path: str, actual_path: str) -> Dict:
        """Complete processing pipeline"""
        # Validate both files
        expected_valid, expected_report = self.validate_file(expected_path)
        actual_valid, actual_report = self.validate_file(actual_path)
        
        validation = {
            'expected': expected_report,
            'actual': actual_report
        }
        
        # Only compare if both files are valid
        if expected_valid and actual_valid:
            score, comparison_details = self.compare_outputs(expected_path, actual_path)
            comparison = {
                'score': score,
                'details': comparison_details
            }
            status = 'success'
        else:
            comparison = None
            status = 'validation_failed'
        
        # Generate report
        report = self.generate_report(validation, comparison)
        
        return {
            'status': status,
            'validation': validation,
            'comparison': comparison,
            'report': report
        }

# Example Usage
if __name__ == "__main__":
    # Initialize with medium tolerance
    checker = ScientificReproducibilityChecker(numeric_tolerance=1e-4)
    
    # Test files (would be researcher uploads)
    expected_file = "study_123/expected_results.csv"
    actual_file = "study_123/reproduced_results.csv"
    
    # Full processing pipeline
    result = checker.process_study(expected_file, actual_file)
    
    # Print comprehensive report
    print(result['report'])
    
    # Access individual components if needed
    if result['status'] == 'success':
        print(f"\nRaw score: {result['comparison']['score']:.4f}")
    
    # Example usage for different file types:
    # CSV comparison
    # result_csv = checker.process_study("expected.csv", "actual.csv")
    
    # Excel comparison  
    # result_xlsx = checker.process_study("expected.xlsx", "actual.xlsx")
    
    # Python code comparison
    # result_py = checker.process_study("expected_analysis.py", "actual_analysis.py")