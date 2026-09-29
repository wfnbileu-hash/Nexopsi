// NexoPsi — Netlify Function para o Gemini
// Configure GEMINI_API_KEY nas Environment Variables do Netlify.
// A chave não fica no HTML.

exports.handler = async function(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: {
      "Access-Control-Allow-Origin":"*",
      "Access-Control-Allow-Headers":"Content-Type",
      "Access-Control-Allow-Methods":"POST, OPTIONS"
    }, body:"" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode:405, headers:{"Content-Type":"application/json"},
      body:JSON.stringify({error:"Método não permitido. Use POST."}) };
  }

  var apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { statusCode:500, headers:{"Content-Type":"application/json"},
      body:JSON.stringify({error:"GEMINI_API_KEY não está disponível para a função Netlify."}) };
  }

  var body = {};
  try { body = JSON.parse(event.body || "{}"); }
  catch(e) {
    return { statusCode:400, headers:{"Content-Type":"application/json"},
      body:JSON.stringify({error:"Corpo da requisição inválido."}) };
  }

  var prompt = String(body.prompt || "").trim();
  if (!prompt) {
    return { statusCode:400, headers:{"Content-Type":"application/json"},
      body:JSON.stringify({error:"Prompt vazio."}) };
  }

  try {
    var url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
      encodeURIComponent(apiKey);

    var response = await fetch(url, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        contents:[{role:"user", parts:[{text:prompt}]}],
        generationConfig:{temperature:0.35, topP:0.9, maxOutputTokens:3000}
      })
    });

    var data = await response.json();

    if (!response.ok) {
      var apiError = data && data.error && data.error.message
        ? data.error.message : ("Gemini HTTP " + response.status);
      return { statusCode:response.status, headers:{"Content-Type":"application/json"},
        body:JSON.stringify({error:apiError}) };
    }

    var text = "";
    if (data.candidates && data.candidates[0] && data.candidates[0].content &&
        data.candidates[0].content.parts) {
      text = data.candidates[0].content.parts.map(function(part){
        return part.text || "";
      }).join("").trim();
    }

    if (!text) {
      var reason = data.promptFeedback
        ? "O Gemini não retornou texto. promptFeedback: " + JSON.stringify(data.promptFeedback)
        : "O Gemini respondeu sem conteúdo textual.";
      return { statusCode:502, headers:{"Content-Type":"application/json"},
        body:JSON.stringify({error:reason}) };
    }

    return { statusCode:200, headers:{
      "Content-Type":"application/json","Cache-Control":"no-store"
    }, body:JSON.stringify({text:text}) };

  } catch(err) {
    console.error("NexoPsi Gemini function error:", err);
    return { statusCode:500, headers:{"Content-Type":"application/json"},
      body:JSON.stringify({error:"Erro interno na função Gemini: " + (err.message || String(err))}) };
  }
};
