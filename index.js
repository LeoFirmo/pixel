const express = require('express');
const path = require('path');
const moment = require('moment-timezone');
const axios = require('axios'); // Importa o axios

const app = express();
const port = process.env.PORT || 3000;

const SAO_PAULO_TIMEZONE = 'America/Sao_Paulo';

// SEU ENDPOINT DO N8N
// Recomenda-se FORTEMENTE usar uma variável de ambiente na Vercel para isso:
// const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://ia-n8n.9d6enk.easypanel.host/webhook/c09492f7-d401-4e49-bc14-6cd375df2caf';
const N8N_WEBHOOK_URL = 'https://ia-n8n.9d6enk.easypanel.host/webhook/c09492f7-d401-4e49-bc14-6cd375df2caf';

// Serve arquivos estáticos da pasta 'img'
app.use('/img', express.static(path.join(__dirname, 'img')));

// Endpoint principal que retorna a imagem e aceita parâmetros
app.get('/api/imagem', async (req, res) => {
    // Pega os parâmetros 'email' e 'horario_disparo_email' da query string
    const { email, horario_disparo_email } = req.query; 

    // Validação básica: 'email' é obrigatório
    if (!email) {
        return res.status(400).send('Parâmetro "email" é obrigatório.');
    }

    // Opcional: Você pode adicionar uma validação para 'horario_disparo_email' também
    if (!horario_disparo_email) {
        console.warn('Parâmetro "horario_disparo_email" não fornecido.');
        // Decida se você quer que ele seja obrigatório ou não.
        // Se for obrigatório, use: return res.status(400).send('Parâmetro "horario_disparo_email" é obrigatório.');
    }

    // --- Lógica de Envio de Dados para o n8n ---
    // Pega o timestamp atual no fuso horário de São Paulo (momento da abertura do e-mail)
    const timestamp_abertura = moment().tz(SAO_PAULO_TIMEZONE).format(); 

    // Objeto com os dados a serem enviados para o n8n
    const dataToN8n = {
        email: email,
        timestamp_abertura: timestamp_abertura, // Quando o e-mail foi aberto (pixel carregado)
        horario_disparo_email: horario_disparo_email || 'N/A', // Horário que o e-mail foi disparado (passado como param)
        source: 'api-imagem-vercel' // Adicione qualquer outra informação que desejar
    };

    try {
        // Opção 1: Enviar dados via GET (parâmetros na URL) - Útil se seu n8n estiver configurado para GET
        // É importante codificar os componentes da URL para evitar problemas com caracteres especiais
        const n8nUrlWithParams = `${N8N_WEBHOOK_URL}?email=${encodeURIComponent(email)}&timestamp_abertura=${encodeURIComponent(timestamp_abertura)}&horario_disparo_email=${encodeURIComponent(horario_disparo_email || 'N/A')}`;
        await axios.get(n8nUrlWithParams);
        console.log(`Dados enviados para o n8n (GET):`, n8nUrlWithParams);

        /*
        // Opção 2: Enviar dados via POST (corpo da requisição JSON) - Geralmente mais robusto para múltiplos parâmetros
        // Se seu webhook do n8n estiver configurado para POST, descomente a linha abaixo e comente a Opção 1
        // await axios.post(N8N_WEBHOOK_URL, dataToN8n);
        // console.log(`Dados enviados para o n8n (POST):`, dataToN8n);
        */

    } catch (error) {
        // É importante lidar com erros aqui para não quebrar a resposta da imagem
        console.error('Erro ao enviar dados para o n8n:', error.message);
        // Opcional: Você pode querer logar isso em outro lugar ou notificar sobre o erro de envio.
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

// Endpoint de teste simples
app.get('/', (req, res) => {
    res.send('API de imagem rodando! Acesse /api/imagem?email=seu@email.com&horario_disparo_email=2025-06-12T10:00:00-03:00');
});

// Inicia o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
    console.log('Acesse o endpoint de imagem em: /api/imagem?email=seu@email.com&horario_disparo_email=2025-06-12T10:00:00-03:00');
    console.log('Os dados de abertura e disparo serão enviados para o n8n.');
});
