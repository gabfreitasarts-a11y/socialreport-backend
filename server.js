// =============================
// Backend PIX + QRCode funcional
// =============================
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const QRCode = require("qrcode");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// =============================
// FUNÇÃO PARA GERAR CRC16
// =============================
function crc16(payload) {
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1) & 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

// =============================
// GERAR PAYLOAD PIX
// =============================
function gerarPayloadPIX({ chave, nome, cidade, valor, txid, mensagem }) {
  const formattedValor = parseFloat(valor).toFixed(2);

  let payload = `
000201
26580014br.gov.bcb.pix
01${chave.length}${chave}
52040000
5303986
54${formattedValor.length}${formattedValor}
5802BR
59${nome.length}${nome}
60${cidade.length}${cidade}
62
05${txid.length}${txid}
`
    .replace(/\s+/g, "");

  if (mensagem) {
    payload += `62${mensagem.length}${mensagem}`;
  }

  const crc = crc16(payload + "6304");
  return payload + "6304" + crc;
}

// =============================
// ENDPOINT PARA GERAR PIX QR
// =============================
app.post("/pix", async (req, res) => {
  try {
    const { chave, nome, cidade, valor, txid, mensagem } = req.body;

    const payload = gerarPayloadPIX({ chave, nome, cidade, valor, txid, mensagem });

    const qr = await QRCode.toDataURL(payload);

    return res.json({ payload, qr });
  } catch (err) {
    console.log("Erro gerar PIX:", err);
    return res.status(500).json({ error: err.message });
  }
});

// =============================
// INICIAR SERVIDOR
// =============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor rodando na porta " + PORT));
