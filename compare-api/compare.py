import re
import numpy as np
from sentence_transformers import SentenceTransformer, util
import os

cache_dir = "/tmp/hf_cache"

os.makedirs(cache_dir, exist_ok=True)

os.environ["HF_HOME"] = cache_dir
os.environ["TRANSFORMERS_CACHE"] = f"{cache_dir}/transformers"
os.environ["SENTENCE_TRANSFORMERS_HOME"] = f"{cache_dir}/sentence_transformers"
os.environ["HF_DATASETS_CACHE"] = f"{cache_dir}/datasets"

class Comparator:
    def __init__(self):
        self.semantic_model = SentenceTransformer(
            "paraphrase-MiniLM-L6-v2"
        )
    def result(self, composite_score: float) -> str:
        if composite_score >= 0.95:
            return "Perfect or near-perfect match. Auto-verified."
        elif composite_score >= 0.90:
            return "High similarity. Acceptable in most cases."
        elif composite_score >= 0.85:
            return "Moderate similarity. Review recommended."
        elif composite_score >= 0.80:
            return "Low similarity. Likely needs correction."
        else:
            return "Poor match. Not verified."
    def compare(self, expected: str, actual: str) -> dict:
        expected_clean = self._clean_text(expected)
        actual_clean = self._clean_text(actual)

        semantic_score = self._semantic_similarity(expected_clean, actual_clean)

        numeric_result = self._compare_numerics(expected_clean, actual_clean)

        composite_score = 0.5 * semantic_score + 0.5 * numeric_result["score"]

        result = self.result(composite_score)
        
        return {
            "composite_score": composite_score,
            "result": result
        }

    def _clean_text(self, text: str) -> str:
        return " ".join(text.strip().split())

    def _semantic_similarity(self, text1: str, text2: str) -> float:
        embeddings = self.semantic_model.encode([text1, text2], convert_to_tensor=True)
        return util.cos_sim(embeddings[0], embeddings[1]).item()

    def _compare_numerics(self, text1: str, text2: str) -> dict:
        nums1 = [float(n) for n in re.findall(r"-?\d+\.?\d*", text1)]
        nums2 = [float(n) for n in re.findall(r"-?\d+\.?\d*", text2)]

        if not nums1 and not nums2:
            return {"score": 1.0, "matched_pairs": []} 

        matched_scores = []
        for n1, n2 in zip(nums1, nums2):
            diff = abs(n1 - n2)
            score = float(np.exp(-diff))
            matched_scores.append(score)

        avg_score = np.mean(matched_scores) if matched_scores else 1.0
        return {"score": avg_score, "matched_pairs": list(zip(nums1, nums2))}


if __name__ == "__main__":
    comparator = Comparator()

    expected = """Verification Score: 0.8"""
    actual = """"""

    results = comparator.compare(expected, actual)
