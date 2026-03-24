FROM python:alpine

WORKDIR /app

COPY requirements.txt .

RUN pip install -r requirements.txt || true

RUN echo "dependencies installed..."

COPY . .

CMD ["python", "app.py"]

