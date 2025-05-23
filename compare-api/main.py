from fastapi import FastAPI, Request
from pydantic import BaseModel
from compare import Comparator

app = FastAPI()
comparator = Comparator()

class CompareRequest(BaseModel):
    expected: str
    actual: str
    
@app.get("/")
def read_root():
    return {"message": "Working!"}
@app.post("/compare")
def compare_text(request: CompareRequest):
    expected = request.expected
    actual = request.actual

    results = comparator.compare(expected, actual)
    
    return{
        "composite_score": results["composite_score"],
        "result" : results["result"],
    }