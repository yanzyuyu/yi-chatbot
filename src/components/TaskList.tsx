import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Plus, Trash2 } from 'lucide-react';

export interface Task {
  id: string;
  title: string;
  completed: boolean;
}

export function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const data = await res.json();
        setTasks(prev => JSON.stringify(prev) !== JSON.stringify(data) ? data : prev);
      }
    } catch (e) {
      console.error('Failed to fetch tasks', e);
    } finally {
      setIsLoading(false);
    }
  };

  const saveTasks = async (newTasks: Task[]) => {
    setTasks(newTasks);
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTasks),
      });
    } catch (e) {
      console.error('Failed to save tasks', e);
    }
  };

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const newTask: Task = { id: Date.now().toString(), title: newTaskTitle.trim(), completed: false };
    saveTasks([...tasks, newTask]);
    setNewTaskTitle('');
  };

  const toggleTask = (id: string) => {
    const newTasks = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    saveTasks(newTasks);
  };

  const deleteTask = (id: string) => {
    const newTasks = tasks.filter(t => t.id !== id);
    saveTasks(newTasks);
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const progress = tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);

  if (isLoading) {
    return (
      <div className="p-8 flex flex-col items-center gap-4 animate-pulse">
        <div className="w-8 h-8 border-2 border-[#3c3c3c] border-t-blue-500 rounded-full animate-spin" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#666]">Retrieving...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-transparent w-full">
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-selection-none">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#666]">Velocity</span>
            <span className="text-[11px] font-bold text-blue-400">{progress}%</span>
          </div>
          <div className="h-1.5 w-full bg-[#2f2f2f] rounded-full overflow-hidden border border-white/5">
            <div className="h-full bg-blue-500 transition-all duration-1000 ease-out" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 md:px-4 py-2 space-y-2 no-scrollbar">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-[#555] gap-3 opacity-40 text-selection-none">
            <Circle className="w-8 h-8 stroke-1" />
            <p className="text-[10px] font-bold uppercase tracking-widest">No objectives</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {tasks.map(task => (
              <div key={task.id} className={`group flex items-start gap-3 p-3 rounded-xl transition-all border ${task.completed ? 'bg-transparent border-transparent opacity-40' : 'bg-[#2f2f2f]/50 border-white/5 hover:border-white/10'}`}>
                <button onClick={() => toggleTask(task.id)} className={`mt-0.5 shrink-0 transition-colors ${task.completed ? 'text-blue-500' : 'text-[#666] hover:text-blue-400'}`}>
                  {task.completed ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                </button>
                <span className={`flex-1 text-[13px] leading-relaxed select-text ${task.completed ? 'line-through text-[#666]' : 'text-[#ececec]'}`}>{task.title}</span>
                <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 p-1 text-[#555] hover:text-red-500 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 md:p-6 mt-auto">
        <form onSubmit={addTask} className="relative group">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="New objective..."
            className="w-full bg-[#2f2f2f] border border-white/10 rounded-xl pl-4 pr-12 py-3 text-xs text-[#ececec] placeholder-[#666] focus:outline-none focus:border-white/20 transition-all"
          />
          <button type="submit" disabled={!newTaskTitle.trim()} className="absolute right-2 top-1.5 p-1.5 bg-[#3e3e3e] text-[#aaa] group-focus-within:bg-white group-focus-within:text-black rounded-lg transition-all active:scale-90">
            <Plus className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
