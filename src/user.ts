export class User {
  public self: object | null | undefined = {};

  constructor(private client: any) {}

  async get() {
    if (this.client) {
      this.self = await this.client.getSelf();
    }
  }
}
