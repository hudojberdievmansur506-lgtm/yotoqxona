import express from 'express';
import path from 'path';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;
const EXTERNAL_API_BASE = 'https://king-dork-opulently.ngrok-free.dev/api';

async function startServer() {
  const app = express();
  
  app.use(cors());
  app.use(express.json());

  // --- API ROUTES ---

  // Health status
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      externalApiBase: EXTERNAL_API_BASE,
      database: 'bypassed'
    });
  });

  // Proxy/Fallback for student search
  app.get('/api/students/search/:studentId', async (req, res) => {
    const { studentId } = req.params;
    const cleanId = studentId.trim();
    console.log(`GET /api/students/search/${cleanId} forwarding to external API`);

    try {
      const response = await fetch(`${EXTERNAL_API_BASE}/students/search/${cleanId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          message: `Ubuntu API returned status: ${response.status}`
        });
      }

      const data = await response.json();
      return res.json(data);
    } catch (err: any) {
      console.error(`Error searching student ${cleanId} from external API:`, err.message || err);
      return res.status(500).json({
        success: false,
        message: 'Tizimga ulanishda xatolik yuz berdi'
      });
    }
  });

  // Proxy/Fallback for applications
  app.get('/api/applications', async (req, res) => {
    console.log('GET /api/applications forwarding to external API');
    try {
      const response = await fetch(`${EXTERNAL_API_BASE}/applications`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          message: `Ubuntu API returned status: ${response.status}`
        });
      }

      const data = await response.json();
      return res.json(data);
    } catch (err: any) {
      console.error('Error fetching applications from external API:', err.message || err);
      return res.status(500).json({
        success: false,
        message: 'Arizalarni yuklashda xatolik yuz berdi'
      });
    }
  });

  // Proxy/Fallback for posting application
  app.post('/api/applications', async (req, res) => {
    console.log('POST /api/applications forwarding to external API');
    try {
      const response = await fetch(`${EXTERNAL_API_BASE}/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'Accept': 'application/json'
        },
        body: JSON.stringify(req.body)
      });

      const data = await response.json();
      return res.status(response.status).json(data);
    } catch (err: any) {
      console.error('Error posting application to external API:', err.message || err);
      return res.status(500).json({
        success: false,
        message: 'Arizani saqlashda xatolik yuz berdi'
      });
    }
  });

  // Proxy/Fallback for status update
  app.put('/api/applications/:id/status', async (req, res) => {
    const { id } = req.params;
    console.log(`PUT /api/applications/${id}/status forwarding to external API`);
    try {
      const response = await fetch(`${EXTERNAL_API_BASE}/applications/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'Accept': 'application/json'
        },
        body: JSON.stringify(req.body)
      });

      const data = await response.json();
      return res.status(response.status).json(data);
    } catch (err: any) {
      console.error('Error updating status on external API:', err.message || err);
      return res.status(500).json({
        success: false,
        message: 'Ariza statusini yangilashda xatolik yuz berdi'
      });
    }
  });

  // Proxy/Fallback for deleting applications
  app.delete('/api/applications/:id', async (req, res) => {
    const { id } = req.params;
    console.log(`DELETE /api/applications/${id} forwarding to external API`);
    try {
      const response = await fetch(`${EXTERNAL_API_BASE}/applications/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'Accept': 'application/json'
        }
      });

      if (response.status === 204) {
        return res.status(204).end();
      }

      const data = await response.json().catch(() => ({}));
      return res.status(response.status).json(data);
    } catch (err: any) {
      console.error('Error deleting application on external API:', err.message || err);
      return res.status(500).json({
        success: false,
        message: 'Arizani o‘chirishda xatolik yuz berdi'
      });
    }
  });

  // --- VITE MIDDLEWARE SETUP ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
