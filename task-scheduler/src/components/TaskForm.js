import React, { useState, useEffect } from "react";
import axios from "axios";
import "./TaskForm.css";

const TaskForm = ({ selectedTask, selectedDate, onClose }) => {
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [recurrence, setRecurrence] = useState("none");

  useEffect(() => {
    if (selectedTask) {
      setTitle(selectedTask.title);
      setTime(selectedTask.time);
      setRecurrence(selectedTask.recurrence);
    } else {
      setTitle("");
      setTime("");
      setRecurrence("none");
    }
  }, [selectedTask]);
  const taskDueDate = selectedTask ? selectedTask.due_date : selectedDate;
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !time) {
      alert("Title and Time are required!");
      return;
    }

    const taskData = { title, due_date: taskDueDate, time, recurrence };

    try {
      if (selectedTask) {
        console.log("Sending task data:", taskData);
        await axios.put(`http://127.0.0.1:5000/tasks/${selectedTask.id}`, taskData);
        alert("Task updated successfully!");
      } else {
        await axios.post("http://127.0.0.1:5000/tasks", taskData);
        alert("Task added successfully!");
      }
      onClose();
      window.location.reload();
    } catch (error) {
        console.log("Sending task data:", taskData);
      console.error("Error saving task:", error.response ? error.response.data : error.message);
      alert("Failed to save task!");
    }
  };

  const handleDelete = async () => {
    if (!selectedTask) return;
    try {
      await axios.delete(`http://127.0.0.1:5000/tasks/${selectedTask.id}`);
      alert("Task deleted successfully");
      window.location.reload();
      onClose();
    } catch (error) {
      alert("Error deleting task");
    }
  };

  const handleMarkComplete = async () => {
    if (!selectedTask) return;
    try {
      await axios.patch(`http://127.0.0.1:5000/tasks/${selectedTask.id}/complete`);
      alert("Task marked as completed");
      onClose();
    } catch (error) {
      alert("Error marking task as completed");
    }
  };

  return (
    <div className="task-form-overlay">
      <div className="task-form">
        <h2>{selectedTask ? "Edit Task" : "Add Task"}</h2>
        <p>Date: {selectedDate}</p>
        <form onSubmit={handleSubmit}>
          <label>Task Title:</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />

          <label>Time:</label>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />

          <label>Recurrence:</label>
          <select value={recurrence} onChange={(e) => setRecurrence(e.target.value)}>
            <option value="none">None</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>

          <button type="submit">{selectedTask ? "Save Changes" : "Save Task"}</button>
          {selectedTask && (
            <>
              <button type="button" className="delete-btn" onClick={handleDelete}>Delete</button>
              <button type="button" className="complete-btn" onClick={handleMarkComplete}>Mark as Completed</button>
            </>
          )}
          <button type="button" className="close-btn" onClick={onClose}>Close</button>
        </form>
      </div>
    </div>
  );
};

export default TaskForm;
