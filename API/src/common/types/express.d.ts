declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      createdAt: Date;
    }
  }
}

export {};
