import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { generateOpenApiDocument } from './openApiGenerator.js';

const openApiRouter = Router();

openApiRouter.get('/docs.json', (_req, res) => {
  res.json(generateOpenApiDocument());
});

openApiRouter.use('/docs', swaggerUi.serve, swaggerUi.setup(null, {
  swaggerOptions: {
    url: '/api/docs.json',
  },
}));

export default openApiRouter;
