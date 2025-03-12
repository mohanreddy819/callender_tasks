from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_apscheduler import APScheduler
from flask_socketio import SocketIO
import sqlite3
from datetime import datetime

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})
socketio = SocketIO(app, cors_allowed_origins="*")  # WebSocket communication
scheduler = APScheduler()
scheduler.init_app(app)
scheduler.start()

# Database Connection Function (Avoids "Database Locked" Errors)
def get_db_connection():
    return sqlite3.connect("tasks.db", timeout=10, check_same_thread=False)

# Initialize the SQLite database
def init_db():
    conn = get_db_connection()
    c = conn.cursor()
    c.execute(
        """CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            due_date TEXT NOT NULL,
            time TEXT NOT NULL,
            recurrence TEXT NOT NULL,
            status TEXT DEFAULT 'pending'
        )"""
    )
    conn.commit()
    conn.close()

init_db()

# Function to send notifications via WebSocket
def send_notification(task_id):
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT title, time FROM tasks WHERE id = ?", (task_id,))
    task = c.fetchone()
    conn.close()

    if task:
        socketio.start_background_task(lambda: socketio.emit("task_reminder", {"title": task[0], "time": task[1]}))

# Fetch all tasks
@app.route("/tasks", methods=["GET"])
def get_tasks():
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM tasks")
    tasks = [{"id": row[0], "title": row[1], "due_date": row[2], "time": row[3], "recurrence": row[4], "status": row[5]} for row in c.fetchall()]
    conn.close()
    return jsonify(tasks)

# Add a new task
@app.route("/tasks", methods=["POST"])
def add_task():
    data = request.json
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("INSERT INTO tasks (title, due_date, time, recurrence) VALUES (?, ?, ?, ?)", (data["title"], data["due_date"], data["time"], data["recurrence"]))
    task_id = c.lastrowid
    conn.commit()
    conn.close()

    # Schedule notification only if it doesn't exist
    job_id = str(task_id)
    if not scheduler.get_job(job_id):
        task_time = datetime.strptime(f"{data['due_date']} {data['time']}", "%Y-%m-%d %H:%M")
        scheduler.add_job(id=job_id, func=send_notification, args=[task_id], trigger="date", run_date=task_time)

    return jsonify({"message": "Task added successfully"}), 201

# Update an existing task
@app.route("/tasks/<int:task_id>", methods=["PUT"])
def update_task(task_id):
    data = request.json

    # Ensure required fields are present
    required_fields = ["title", "due_date", "time", "recurrence"]
    for field in required_fields:
        if field not in data or not data[field]:
            return jsonify({"error": f"Missing required field: {field}"}), 400

    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("UPDATE tasks SET title = ?, due_date = ?, time = ?, recurrence = ? WHERE id = ?", 
                  (data["title"], data["due_date"], data["time"], data["recurrence"], task_id))
        conn.commit()
    except sqlite3.IntegrityError as e:
        conn.close()
        return jsonify({"error": str(e)}), 500

    conn.close()
    return jsonify({"message": "Task updated successfully"}), 200


# Delete a task
@app.route("/tasks/<int:task_id>", methods=["DELETE"])
def delete_task(task_id):
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
    conn.commit()
    conn.close()

    # Remove scheduled job if it exists
    job_id = str(task_id)
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)

    return jsonify({"message": "Task deleted"}), 200

# Mark task as completed
@app.route("/tasks/<int:task_id>/complete", methods=["PATCH"])
def complete_task(task_id):
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("UPDATE tasks SET status = 'completed' WHERE id = ?", (task_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Task marked as completed"}), 200

# WebSocket connection event
@socketio.on("connect")
def handle_connect():
    print("WebSocket connected")

# Run Flask with WebSocket support
if __name__ == "__main__":
    socketio.run(app, debug=True)
