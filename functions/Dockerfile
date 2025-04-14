# Use an official Python runtime as a parent image
FROM python:3.9-slim-buster

# Set working directory
WORKDIR /app

# Copy dependency file and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code (including functions/api/)
COPY . .

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=5000

# Expose port
EXPOSE ${PORT}

# Command to run the server (using a simple Python server for testing; adjust for production)
CMD ["gunicorn", "--bind", "0.0.0.0:${PORT}", "--workers", "2", "--threads", "4", "--timeout", "0", "functions.api.top_headlines:handler"]