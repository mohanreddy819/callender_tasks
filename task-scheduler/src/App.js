import React, { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { io } from "socket.io-client";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import TaskForm from "./components/TaskForm";
import "./App.css"; 

const API_URL = "http://127.0.0.1:5000/tasks";
const SOCKET_URL = "http://127.0.0.1:5000"; 

const App = () => {
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    fetchTasks();
    requestNotificationPermission();
    setupWebSocket();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await axios.get(API_URL);
      setTasks(res.data);
    } catch (error) {
      toast.error("Error fetching tasks");
    }
  };

  const requestNotificationPermission = () => {
    if ("Notification" in window) {
      Notification.requestPermission().then((permission) => {
        if (permission !== "granted") {
          toast.warn("Enable notifications for reminders!");
        }
      });
    }
  };

  const showNotification = (title, time) => {
    if (Notification.permission === "granted") {
      new Notification("Task Reminder", {
        body: `${title} at ${time}`,
        icon: "https://cdn-icons-png.flaticon.com/512/1827/1827379.png",
      });
    } else {
      toast.info(`${title} at ${time}`);
    }
  };

  const setupWebSocket = () => {
    const socket = io(SOCKET_URL);

    socket.on("connect", () => {
      console.log("✅ WebSocket Connected");
    });

    socket.on("task_reminder", (data) => {
      console.log("🔔 New Notification:", data);
      showNotification(data.title, data.time);
    });

    socket.on("disconnect", () => {
      console.log("❌ WebSocket Disconnected");
    });

    return () => socket.disconnect();
  };

  const handleDateClick = (info) => {
    setSelectedTask(null); 
    setSelectedDate(info.dateStr);
  };

  const handleTaskClick = (clickInfo) => {
    const task = tasks.find((t) => t.title === clickInfo.event.title);
    setSelectedTask(task);
  };

  const handleSaveTask = async (taskData) => {
    try {
      if (selectedTask) {
        await axios.put(`${API_URL}/${selectedTask.id}`, taskData);
        toast.success("Task updated!");
      } else {
        await axios.post(API_URL, taskData);
        toast.success("Task added!");
      }
      fetchTasks();
      setSelectedDate(null);
      setSelectedTask(null);
    } catch (error) {
      toast.error("Error saving task");
    }
  };

  const handleDeleteTask = async () => {
    try {
      await axios.delete(`${API_URL}/${selectedTask.id}`);
      toast.success("Task deleted!");
      fetchTasks();
      setSelectedTask(null);
    } catch (error) {
      toast.error("Error deleting task");
    }
  };

  const handleCompleteTask = async () => {
    try {
      await axios.patch(`${API_URL}/${selectedTask.id}/complete`);
      toast.success("Task marked as completed!");
      fetchTasks();
      setSelectedTask(null);
    } catch (error) {
      toast.error("Error marking task as complete");
    }
  };
  
//-------------------------------------------------

const generateRecurringEvents = () => {
  let events = [];

  tasks.forEach((task) => {
    const baseEvent = {
      title: task.title,
      className:
        task.recurrence === "daily"
          ? "fc-event-daily"
          : task.recurrence === "weekly"
          ? "fc-event-weekly"
          : "fc-event-none",
    };

    if (task.recurrence === "daily") {
      // Generate daily occurrences for the next 30 days
      for (let i = 0; i < 30; i++) {
        const date = new Date(task.due_date);
        date.setDate(date.getDate() + i);
        events.push({ ...baseEvent, start: date.toISOString().split("T")[0] + "T" + task.time });
      }
    } else if (task.recurrence === "weekly") {
      // Generate weekly occurrences for the next 8 weeks
      for (let i = 0; i < 8; i++) {
        const date = new Date(task.due_date);
        date.setDate(date.getDate() + i * 7);
        events.push({ ...baseEvent, start: date.toISOString().split("T")[0] + "T" + task.time });
      }
    } else {
      // One-time task
      events.push({ ...baseEvent, start: `${task.due_date}T${task.time}` });
    }
  });

  return events;
};





//--------------------------------------------------

  return (
    <div className="app-container">
      <h1>Task Scheduler</h1>
    <div className={`calendar-container ${selectedDate || selectedTask ? "blur" : ""}`}>
        <FullCalendar
      plugins={[dayGridPlugin, interactionPlugin]}
      initialView="dayGridMonth"
      dateClick={handleDateClick}
      eventClick={handleTaskClick}
      events={generateRecurringEvents()}
      
      // eventContent={(eventInfo) => {
      //   let icon = "⚫"; // Default for one-time tasks
      //   if (eventInfo.event.extendedProps.recurrence === "daily") {
      //     icon = "🔵";
      //   } else if (eventInfo.event.extendedProps.recurrence === "weekly") {
      //     icon = "🟢";
      //   }
      //   return {
      //     html: `<span>${icon} ${eventInfo.event.title}</span>`,
      //   };
      // }}
    />
    </div>

    <div className="legend-box">
      <h3><b>Colour Detail</b></h3>
      <div className="legend-item">
        <span className="color-box daily"></span> Daily Task
      </div>
      <div className="legend-item">
        <span className="color-box weekly"></span> Weekly Task
      </div>
      <div className="legend-item">
        <span className="color-box none"></span> One-Time Task
      </div>
      <div className="legend-item">
        <b> Click Task to Edit</b>
      </div>
    </div>
      {(selectedDate || selectedTask) && (
        <TaskForm
          selectedDate={selectedDate}
          selectedTask={selectedTask}
          onClose={() => { setSelectedDate(null); setSelectedTask(null); }}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
          onComplete={handleCompleteTask}
        />
      )}
    </div>
  );
};

export default App;
