import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:3002';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const pathSegments = (req.query.path as string[]) || [];
  const subPath      = pathSegments.join('/');
  const targetUrl    = `${BACKEND}/api/inquisitiveAI/${subPath}`;

  try {
    const response = await axios({
      method:  req.method as string,
      url:     targetUrl,
      data:    req.body,
      params:  req.query.path ? undefined : req.query,
      headers: { 'Content-Type': 'application/json' },
      timeout: 15_000,
    });
    res.status(response.status).json(response.data);
  } catch (err: any) {
    const status = err.response?.status || 503;
    const data   = err.response?.data   || { error: err.message };
    res.status(status).json(data);
  }
}
