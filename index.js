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

// Mapeamento dos códigos numéricos para os dias
const DIA_MAP = {
    '43910685': 'Dia 1',
    '1045167993': 'Dia 4',
    '1045282375': 'Dia 7',
    '1045168022': 'Dia 10'
};

// Serve arquivos estáticos da pasta 'img'
app.use('/img', express.static(path.join(__dirname, 'img')));

// Endpoint principal que retorna a imagem e aceita parâmetros
app.get('/api/imagem', async (req, res) => {
    // Pega os parâmetros 'email', 'horario_disparo_email', 'dia', 'id_hubspot', 'nome_escola' e 'titulo_email' da query string
    const { email, horario_disparo_email, dia, id_hubspot, nome_escola, titulo_email } = req.query; 

    // Validação básica: 'email' é obrigatório
    if (!email) {
        return res.status(400).send('Parâmetro "email" é obrigatório.');
    }

    // Opcional: Validação para 'horario_disparo_email'
    if (!horario_disparo_email) {
        console.warn('Parâmetro "horario_disparo_email" não fornecido.');
    }

    // Opcional: Validação para 'id_hubspot'
    if (!id_hubspot) {
        console.warn('Parâmetro "id_hubspot" não fornecido.');
    }

    // Opcional: Validação para 'nome_escola'
    if (!nome_escola) {
        console.warn('Parâmetro "nome_escola" não fornecido.');
    }

    // Opcional: Validação para 'titulo_email'
    if (!titulo_email) {
        console.warn('Parâmetro "titulo_email" não fornecido ou está vazio.');
    }

    // --- Lógica de Conversão do Parâmetro 'dia' ---
    let dia_convertido = 'Dia Não Reconhecido'; // Valor padrão para códigos não mapeados

    if (dia && DIA_MAP[dia]) {
        dia_convertido = DIA_MAP[dia];
    } else if (dia) {
        console.warn(`Código de 'dia' "${dia}" não mapeado. Usando valor padrão.`);
    } else {
        console.warn(`Parâmetro 'dia' não fornecido.`);
    }

    // --- Lógica de Envio de Dados para o n8n ---
    // Pega o timestamp atual no fuso horário de São Paulo (momento da abertura do e-mail)
    const timestamp_abertura = moment().tz(SAO_PAULO_TIMEZONE).format(); 

    // Objeto com os dados a serem enviados para o n8n
    const dataToN8n = {
        email: email,
        timestamp_abertura: timestamp_abertura, // Quando o e-mail foi aberto (pixel carregado)
        horario_disparo_email: horario_disparo_email || 'N/A', // Horário que o e-mail foi disparado (passado como param)
        dia_rastreamento: dia_convertido, // O DIA convertido para "Dia 1", "Dia 4", etc.
        id_hubspot: id_hubspot || 'N/A', // Parâmetro: ID do HubSpot
        nome_escola: nome_escola || 'N/A', // Parâmetro: Nome da Escola
        titulo_email: titulo_email || 'N/A', // NOVO: Parâmetro: Título do E-mail (pode ser vazio)
        source: 'api-imagem-vercel' // Adicione qualquer outra informação que desejar
    };

    try {
        // Enviar dados via GET (parâmetros na URL)
        // É importante codificar os componentes da URL para evitar problemas com caracteres especiais
        const n8nUrlWithParams = `${N8N_WEBHOOK_URL}?email=${encodeURIComponent(email)}&timestamp_abertura=${encodeURIComponent(timestamp_abertura)}&horario_disparo_email=${encodeURIComponent(horario_disparo_email || 'N/A')}&dia_rastreamento=${encodeURIComponent(dia_convertido)}&id_hubspot=${encodeURIComponent(id_hubspot || 'N/A')}&nome_escola=${encodeURIComponent(nome_escola || 'N/A')}&titulo_email=${encodeURIComponent(titulo_email || 'N/A')}`;
        
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
    // URL de exemplo agora inclui todos os novos parâmetros
    res.send('API de imagem rodando! Acesse /api/imagem?email=seu@email.com&horario_disparo_email=2025-06-12T10:00:00-03:00&dia=43910685&id_hubspot=123456&nome_escola=EscolaTesteVercel&titulo_email=TituloDoEmailDeTeste');
});

// Inicia o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
    console.log('Acesse o endpoint de imagem em: /api/imagem?email=seu@email.com&horario_disparo_email=2025-06-12T10:00:00-03:00&dia=43910685&id_hubspot=123456&nome_escola=EscolaTesteVercel&titulo_email=TituloDoEmailDeTeste');
    console.log('Os dados de abertura, disparo, dia, id_hubspot, nome_escola e titulo_email serão enviados para o n8n.');
});
