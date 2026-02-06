import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import registry from './openApiRegistry';

export function generateOpenApiDocument(): ReturnType<
  OpenApiGeneratorV3['generateDocument']
> {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: '3.0.3',
    info: {
      title: 'Coup API',
      version: '1.0.0',
    },
  });
}
