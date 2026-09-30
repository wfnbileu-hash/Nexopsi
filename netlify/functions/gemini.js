exports.handler = async function(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { prompt } = JSON.parse(event.body);
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: "Chave de API não configurada no servidor." }) };
    }

    // Lista de modelos para testar em ordem de prioridade
    const modelsToTry = [
      "gemini-2.0-flash",
      "gemini-1.5-flash",
      "gemini-1.5-pro"
    ];

    let data = null;
    let lastError = "";

    for (const model of modelsToTry) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        });

        const json = await response.json();

        if (!json.error && json.candidates) {
          data = json;
          break; // Encontrou um modelo funcional, sai do ciclo
        } else if (json.error) {
          lastError = json.error.message;
        }
      } catch (err) {
        lastError = err.message;
      }
    }

    if (!data) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Nenhum modelo disponível respondeu com sucesso. Detalhe: " + lastError })
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
