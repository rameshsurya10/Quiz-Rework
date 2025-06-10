require('dotenv').config()
const express = require('express')
const { createClient } = require('@supabase/supabase-js')

const app = express()
const port = process.env.PORT || 3000

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

app.use(express.json())

// Endpoint: /mcp/query
app.post('/mcp/query', async (req, res) => {
  const { model, filters } = req.body

  try {
    const query = supabase.from(model).select('*')
    if (filters && Object.keys(filters).length > 0) {
      query.match(filters)
    }

    const { data, error } = await query
    if (error) throw error

    res.json({ data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Endpoint: /mcp/models
app.get('/mcp/models', (req, res) => {
  res.json({
    models: [
      {
        name: 'users',
        fields: ['id', 'email', 'created_at']
      },
      {
        name: 'quiz',
        fields: ['id', 'title', 'teacher_id']
      }
    ]
  })
})

app.listen(port, () => {
  console.log(`🧠 MCP-Supabase server running at http://localhost:${port}`)
})
