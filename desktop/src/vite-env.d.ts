interface Window {
  electronAPI: {
    ping: () => string;

    checkBackend: () => Promise<{
      status: string;
      service: string;
    }>;

    signIn: () => Promise<{
      localId: string;
      email?: string;
      displayName?: string;
      photoUrl?: string;
      idToken: string;
    }>;

    getSession: () => Promise<{
      localId: string;
      idToken: string;
    } | null>;

    signOut: () => Promise<void>;
    getIdToken(): Promise<string | null>;
    pickStatementFile(): Promise<
      | {
          filePath: string;
          content: string;
        }[]
      | null
    >;
  };
}
