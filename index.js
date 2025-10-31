// server.js
require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();
const { APP_ID, APP_SECRET, BASE_URL, PORT, FACEBOOK_ACCESS_TOKEN } = process.env;

// ------------------------------------------------------
// 1️⃣ Ruta: Iniciar login con Facebook
// ------------------------------------------------------
app.get("/auth/facebook", (req, res) => {
  const redirectUri = `${BASE_URL}/auth/facebook/callback`;
  const url = `https://www.facebook.com/v17.0/dialog/oauth?client_id=${APP_ID}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=email,user_posts,publish_actions&response_type=code`;

  res.redirect(url);
});

// ------------------------------------------------------
// 2️⃣ Ruta: Callback de Facebook (intercambio de code por access_token)
// ------------------------------------------------------
app.get("/auth/facebook/callback", async (req, res) => {
  const code = req.query.code;
  const redirectUri = `${BASE_URL}/auth/facebook/callback`;

  try {
    const tokenRes = await axios.get(
      "https://graph.facebook.com/v17.0/oauth/access_token",
      {
        params: {
          client_id: APP_ID,
          client_secret: APP_SECRET,
          redirect_uri: redirectUri,
          code,
        },
      }
    );

    const accessToken = tokenRes.data.access_token;

    res.send(`
      <h3>✅ Token obtenido correctamente</h3>
      <p><b>Access Token:</b></p>
      <pre>${accessToken}</pre>
      <a href="/posts?token=${accessToken}">➡️ Ver mis publicaciones</a><br><br>
      <form action="/post" method="POST">
        <input type="hidden" name="token" value="${accessToken}">
        <textarea name="message" rows="3" cols="40" placeholder="Escribe algo para publicar..."></textarea><br>
        <button type="submit">Publicar en mi muro</button>
      </form>
    `);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send("❌ Error al obtener el token");
  }
});

// ------------------------------------------------------
// 3️⃣ Ruta: Leer publicaciones del usuario
// ------------------------------------------------------
app.get("/posts", async (req, res) => {
  // Si no se pasó el token por URL, usa el del entorno (.env)
  const token = req.query.token || FACEBOOK_ACCESS_TOKEN;

  try {
    const postsRes = await axios.get("https://graph.facebook.com/v17.0/me/feed", {
      params: {
        access_token: token,
        fields: "id,message,created_time,permalink_url",
      },
    });

    const posts = postsRes.data.data;
    let html = "<h2>📰 Mis publicaciones:</h2>";

    posts.forEach((p) => {
      html += `
        <div style="border:1px solid #ccc; margin:10px; padding:10px">
          <b>ID:</b> ${p.id}<br>
          <b>Fecha:</b> ${p.created_time}<br>
          <b>Mensaje:</b> ${p.message ?? "<i>Sin texto</i>"}<br>
          <a href="${p.permalink_url}" target="_blank">Ver en Facebook</a>
        </div>
      `;
    });

    res.send(html);
  } catch (err) {
    console.error("Error al obtener publicaciones:", err.response?.data || err);
    res.status(500).send("❌ Error al obtener publicaciones");
  }
});

// ------------------------------------------------------
// 4️⃣ Ruta: Publicar en el muro del usuario (POST /me/feed)
// ------------------------------------------------------
app.use(express.urlencoded({ extended: true })); // para leer datos del formulario

app.post("/post", async (req, res) => {
  const token = req.body.token || FACEBOOK_ACCESS_TOKEN;
  const message = req.body.message || "¡Hola desde mi app con Node.js y Facebook Graph API!";

  try {
    const postRes = await axios.post(
      "https://graph.facebook.com/v17.0/me/feed",
      new URLSearchParams({
        message,
        access_token: token,
      })
    );

    res.send(`
      <h3>✅ Publicación exitosa</h3>
      <p>ID de la publicación: ${postRes.data.id}</p>
      <a href="/posts?token=${token}">Ver mis publicaciones</a>
    `);
  } catch (err) {
    console.error("Error al publicar:", err.response?.data || err);
    res.status(500).send("❌ Error al publicar en el muro");
  }
});

// ------------------------------------------------------
// 🚀 Servidor en Render o local
// ------------------------------------------------------
app.listen(PORT || 3000, () => console.log(`Servidor corriendo en ${PORT || 3000}`));
