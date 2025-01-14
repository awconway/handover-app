from fastapi import FastAPI

app = FastAPI()

@app.get("/api/data")
async def get_data():
    return {"message": "Hello from FastAPI"}
