declare module 'mu' {
  import { Express, NextFunction } from 'express';

  export type SparqlResponse = {
    head: {
      vars: string[];
    };
    results: {
      bindings: Record<
        string,
        {
          type: string;
          value: string;
        }
      >[];
    };
  };

  export const app: Express;
  export const query: (query: string) => Promise<SparqlResponse>;
  export const update: (query: string) => Promise<void>;
  export const uuid: () => string;
  export const sparqlEscape: (value: unknown, type: string) => string;
  export const sparqlEscapeString: (value: string) => string;
  export const sparqlEscapeUri: (value: string) => string;
  export const sparqlEscapeInt: (value: number) => string;
  export const sparqlEscapeDecimal: (value: number) => string;
  export const sparqlEscapeFloat: (value: number) => string;
  export const sparqlEscapeDateTime: (value: Date) => string;
  export const sparqlEscapeBool: (value: boolean) => string;
  export const sparqlEscapeDate: (value: Date) => string;
  export const errorHandler: (
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
  ) => void;
  // this is a tagged template string function
  export const sparql: (
    strings: TemplateStringsArray,
    ...values: unknown[]
  ) => string;
  export const SPARQL: (
    strings: TemplateStringsArray,
    ...values: unknown[]
  ) => string;

  const mu: {
    app: typeof app;
    query: typeof query;
    update: typeof update;
    uuid: typeof uuid;
    sparqlEscape: typeof sparqlEscape;
    sparqlEscapeString: typeof sparqlEscapeString;
    sparqlEscapeUri: typeof sparqlEscapeUri;
    sparqlEscapeInt: typeof sparqlEscapeInt;
    sparqlEscapeDecimal: typeof sparqlEscapeDecimal;
    sparqlEscapeFloat: typeof sparqlEscapeFloat;
    sparqlEscapeDateTime: typeof sparqlEscapeDateTime;
    sparqlEscapeBool: typeof sparqlEscapeBool;
    sparqlEscapeDate: typeof sparqlEscapeDate;
    errorHandler: typeof errorHandler;
    sparql: typeof sparql;
    SPARQL: typeof SPARQL;
    newSparqlClient: typeof newSparqlClient;
  };
  export default mu;
}
