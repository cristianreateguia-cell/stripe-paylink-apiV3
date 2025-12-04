import express from 'express';
import Stripe from 'stripe';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

app.use(cors({
  origin: '*',
  methods: ['POST'],
  allowedHeaders: ['Content-Type']
}));

console.log("Clave Stripe en tiempo de ejecución:", process.env.STRIPE_SECRET_KEY);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const parseAmountToCents = (amountStr) => {
  const n = Number(amountStr);
  if (!Number.isFinite(n) || n <= 0) throw new Error('Monto inválido');
  return Math.round(n * 100);
};

app.post('/create-payment-link', async (req, res) => {
  try {
    const { serviceName, amountMXN, description } = req.body;

    if (!serviceName || !amountMXN) {
      return res.status(400).json({ error: 'Faltan campos: serviceName y amountMXN' });
    }

    const amountInCents = parseAmountToCents(amountMXN);

    const product = await stripe.products.create({
      name: serviceName,
      description: description || 'Servicio Manos a la Obra'
    });

    const price = await stripe.prices.create({
      unit_amount: amountInCents,
      currency: 'mxn',
      product: product.id
    });

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price: price.id,
          quantity: 1
        }
      ]
    });

    return res.json({
      url: paymentLink.url
    });
  } catch (error) {
    console.error('Error al crear Payment Link:', error);
    return res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});
