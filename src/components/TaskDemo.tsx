import { useState } from 'react'

interface Task {
  id: number
  text: string
  completed: boolean
}

export function TaskDemo() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: 1, text: 'Khởi tạo dự án Vite + React', completed: true },
    { id: 2, text: 'Cài đặt và cấu hình TypeScript', completed: true },
    { id: 3, text: 'Bắt đầu phát triển ứng dụng của bạn!', completed: false },
  ])
  const [newText, setNewText] = useState('')

  const addTask = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newText.trim()) return

    setTasks([
      ...tasks,
      {
        id: Date.now(),
        text: newText.trim(),
        completed: false,
      },
    ])
    setNewText('')
  }

  const toggleTask = (id: number) => {
    setTasks(
      tasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    )
  }

  const deleteTask = (id: number) => {
    setTasks(tasks.filter((task) => task.id !== id))
  }

  return (
    <div style={{
      maxWidth: '560px',
      margin: '2rem auto',
      padding: '1.5rem',
      borderRadius: '12px',
      border: '1px solid var(--border)',
      background: 'var(--social-bg)',
      boxShadow: 'var(--shadow)',
      textAlign: 'left'
    }}>
      <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>📋</span> Ví dụ tương tác (Task Demo)
      </h3>

      <form onSubmit={addTask} style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Thêm nhiệm vụ mới..."
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            background: 'var(--code-bg)',
            color: 'inherit',
            fontSize: '15px',
            outline: 'none'
          }}
        />
        <button
          type="submit"
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            border: 'none',
            background: 'var(--accent)',
            color: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '15px'
          }}
        >
          Thêm
        </button>
      </form>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {tasks.map((task) => (
          <li
            key={task.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--bg)',
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1 }}>
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => toggleTask(task.id)}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent)' }}
              />
              <span
                style={{
                  textDecoration: task.completed ? 'line-through' : 'none',
                  opacity: task.completed ? 0.6 : 1,
                  fontSize: '15px',
                  color: 'var(--text-h)'
                }}
              >
                {task.text}
              </span>
            </label>
            <button
              type="button"
              onClick={() => deleteTask(task.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ff4d4f',
                cursor: 'pointer',
                fontSize: '16px',
                padding: '4px 8px'
              }}
              title="Xóa"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text)', textAlign: 'right' }}>
        Hoàn thành: {tasks.filter(t => t.completed).length}/{tasks.length}
      </div>
    </div>
  )
}
