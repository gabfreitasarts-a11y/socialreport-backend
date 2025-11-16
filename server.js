// =============================
// SocialReport Backend + Mercado Pago + PIX
// =============================
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mercadopago = require("mercadopago");
const QRCode = require("qrcode");

const app = express();

app.use(cors());
app.use(bodyParser.json());

// =============================
// CREDENCIAIS MERCADO PAGO
// =============================
mercadopago.configure({
  access_token: "TEST-1067401983516301-111613-1fd620b496a5640c47e200ea2d14de4f-530086420"
});

// =============================
// CRIAR PAGAMENTO MERCADO PAGO
// =============================
app.post("/create_payment", async (req, res) => {
  try {
    const preference = {
      items: [{
        title: "Assinatura Social Report",
        quantity: 1,
        unit_price: 9.90
      }],
      notification_url: "https://SEU-BACKEND.onrender.com/webhook",
      back_urls: {
        success: "https://SEU-FRONTEND.vercel.app",
        pending: "https://SEU-FRONTEND.vercel.app/pay.html",
        failure: "https://SEU-FRONTEND.vercel.app/pay.html"
      },
      auto_return: "approved"
    };

    const response = await mercadopago.preferences.create(preference);

    return res.json({
      init_point: response.body.init_point
    });

  } catch (err) {
    console.log("Erro ao criar pagamento:", err);
    return res.status(500).json({ error: err.message });
  }
});

// =============================
// WEBHOOK -> Mercado Pago
// =============================
app.post("/webhook", async (req, res) => {
  try {
    const notification = req.body;

    if (notification.type === "payment") {
      const payment = await mercadopago.payment.findById(notification.data.id);
      const status = payment.body.status;

      console.log("Status do pagamento:", status);

      if (status === "approved") {
        console.log("🔥 Pagamento aprovado! Liberar 1 análise ao usuário.");
        // Aqui você pode liberar acesso ou salvar no banco
      }
    }

    return res.sendStatus(200);

  } catch (err) {
    console.log("Erro no webhook:", err);
    return res.sendStatus(500);
  }
});

// =============================
// GERAR PIX DINÂMICO
// =============================
app.post("/create_pix", async (req, res) => {
  try {
    const { valor } = req.body || {};
    const PIX = {
      chave: "14982098075",
      nome: "Gabriel Freitas",
      cidade: "Garça-SP",
      mensagem: "Assinatura SocialReport",
      valor: valor ? parseFloat(valor) : 9.90
    };

    const txid = "SR-" + Date.now();

    const payload = `
000201
26580014br.gov.bcb.pix
01${PIX.chave.length.toString().padStart(2, "0")}${PIX.chave}
52040000
5303986
5404${PIX.valor.toFixed(2)}
5802BR
5909${PIX.nome}
6006${PIX.cidade}
62070506${txid}
6304`;

    const qrCodeBase64 = await QRCode.toDataURL(payload.trim());

    return res.json({
      txid,
      valor: PIX.valor,
      qrCodeBase64
    });

  } catch (err) {
    console.error("Erro ao gerar QR PIX:", err);
    return res.status(500).json({ error: err.message });
  }
});

// =============================
// API DEMO do Instagram
// =============================
app.get("/api/instagram/:username", (req, res) => {
  res.json({
    username: req.params.username,
    seguidores: 12400,
    biografia: "Perfil analisado automaticamente.",
    midias: [],
    posts: 82,
    foto: ""
  });
});

// =============================
// INICIAR SERVIDOR
// =============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor rodando na porta " + PORT));
