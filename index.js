const express = require('express');
const cors = require('cors'); // ← IMPORTANTE: importar cors
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { ComputerVisionClient } = require('@azure/cognitiveservices-computervision');
const { ApiKeyCredentials } = require('@azure/ms-rest-js');

const app = express();

// 🟩 Activar CORS para permitir peticiones desde el frontend
app.use(cors());

// Middleware para JSON
app.use(express.json());

// Configuración de multer
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});
const uploadSingle = multer({ storage: storage }).single('image');

// Credenciales de Azure
const key = '33zJsVGnJhzkOb9WimRFjJJZAmJCCOm2mLdgRH5lFI4EduX0Bn30JQQJ99BGACYeBjFXJ3w3AAAFACOGHqPM';
const endpoint = 'https://computervisionapicloudutn.cognitiveservices.azure.com/';
const computerVisionClient = new ComputerVisionClient(
  new ApiKeyCredentials({ inHeader: { 'Ocp-Apim-Subscription-Key': key } }),
  endpoint
);

// Ruta para análisis de imagen
app.post('/analyze-image', (req, res) => {
  uploadSingle(req, res, async (err) => {
    if (err) return res.status(500).json({ error: 'Error uploading file' });

    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    try {
      const imageBuffer = fs.readFileSync(file.path);

      // Analizar en español
      const resultEs = await computerVisionClient.analyzeImageInStream(() => imageBuffer, {
        visualFeatures: ['Description', 'Tags'],
        language: 'es'
      });

      // Analizar en portugués
      const resultPt = await computerVisionClient.analyzeImageInStream(() => imageBuffer, {
        visualFeatures: ['Description'],
        language: 'pt'
      });

      const descripcionEs = resultEs.description?.captions?.[0]?.text || 'Descripción no disponible';
      const descripcionPt = resultPt.description?.captions?.[0]?.text || 'Descrição indisponível';
      const tags = resultEs.tags.map(tag => tag.name).join(', ');

      res.json({
        filename: file.filename,
        description: {
          español: descripcionEs,
          portugues: descripcionPt,
          tags: tags
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Error analyzing image', details: error.message });
    }
  });
});

// Puerto del servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


