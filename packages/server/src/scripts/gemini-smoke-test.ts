import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY manquant dans .env');
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const model = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';

  console.log(`🔎 Test avec le modèle : ${model}`);

  const response = await ai.models.generateContent({
    model,
    contents:
      'Réponds uniquement par "OK" si tu reçois ce message. Also provide token usage information in the response.',
  });

  // const interaction = await ai.interactions.create({
  //   model,
  //   input: 'Explain how AI works in a few words',
  // });

  console.log('✅ Interaction créée :', response.usageMetadata);
  console.log('✅ Réponse reçue :', response.text);
}

main().catch((err) => {
  console.error('❌ Échec du test Gemini :', err.message ?? err);
  process.exit(1);
});
