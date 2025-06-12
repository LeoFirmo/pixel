const express = require('express');
const path = require('path');
const moment = require('moment-timezone');
const axios = require('axios'); // Importa o axios

const app = express();
const port = process.env.PORT || 3000;

const SAO_PAULO_TIMEZONE = 'America/Sao_Paulo';

// SEU ENDPOINT DO N8N
const N8N_WEBHOOK_URL = 'https://ia-n8n.9d6enk.easypanel.host/webhook/c09492f7-d401-4e49-bc14-6cd375df2caf';

app.use('/img', express.static(path.join(__dirname, 'img')));

app.get('/api/imagem', async (req, res) => { // Tornar a função assíncrona
    const { email } = req.query; // Pega o parâmetro 'email' da query string

    if (!email) {
        return res.status(400).send('Parâmetro "email" é obrigatório.');
    }

    // --- Lógica de Envio para o n8n ---
    const timestamp = moment().tz(SAO_PAULO_TIMEZONE).format(); // Hora de São Paulo

    const dataToN8n = {
        email: email,
        timestamp: timestamp,
        source: 'api-imagem-vercel' // Adicione qualquer outra informação que desejar
    };

    try {
        // Envia os dados para o webhook do n8n via POST
        // Use POST se você espera um corpo de requisição no n8n.
        // Se o seu webhook do n8n está configurado para receber via query params (GET),
        // você pode construir a URL com os parâmetros:
        const n8nUrlWithParams = `${N8N_WEBHOOK_URL}?email=${encodeURIComponent(email)}&timestamp=${encodeURIComponent(timestamp)}`;
        await axios.get(n8nUrlWithParams);

        // await axios.post(N8N_WEBHOOK_URL, dataToN8n);
        console.log(`Dados enviados para o n8n:`, n8nUrlWithParams);

    } catch (error) {
        // É importante lidar com erros aqui para não quebrar a resposta da imagem
        console.error('Erro ao enviar dados para o n8n:', error.message);
        // Opcional: Você pode querer logar isso em outro lugar ou notificar
    }
    // --- Fim da Lógica de Envio para o n8n ---

    // Nome da sua imagem na pasta 'img'
    const imageName = 'pixelone.png'; // <-- MUDE PARA O NOME DA SUA IMAGEM
    const imagePath = path.join(__dirname, 'img', imageName);

    // Envia a imagem como resposta
    res.sendFile(imagePath, (err) => {
        if (err) {
            console.error('Erro ao enviar a imagem:', err);
            res.status(500).send('Erro interno do servidor ao carregar a imagem.');
        } else {
            console.log(`Imagem "${imageName}" enviada com sucesso para ${email}.`);
        }
    });
});

// Endpoint de teste simples (removido o /api/acessos pois não há mais arquivo local)
app.get('/', (req, res) => {
    res.send('API de imagem rodando! Acesse /api/imagem?email=seu@email.com');
});


// Inicia o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
    console.log('Acesse o endpoint de imagem em: /api/imagem?email=seu@email.com');
    console.log('Os dados serão enviados para o n8n.');
});