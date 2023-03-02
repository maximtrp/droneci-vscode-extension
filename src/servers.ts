import * as vscode from "vscode";

interface ServerInfo {
  id: number;
  url: string;
  token: string;
  label: string;
}

export class ServersProvider implements vscode.TreeDataProvider<Server> {
  servers: ServerInfo[] = [];

  constructor(private context: vscode.ExtensionContext) {}

  private _onDidChangeTreeData: vscode.EventEmitter<Server | undefined | null | void> = new vscode.EventEmitter<
    Server | undefined | null | void
  >();
  readonly onDidChangeTreeData: vscode.Event<Server | undefined | null | void> = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  async addServer() {
    let servers: ServerInfo[] = [];

    const url = await vscode.window.showInputBox({
      placeHolder: "https://drone.domain.name",
      prompt: "Please specify Drone CI server address",
      value: "",
      ignoreFocusOut: true,
    });
    if (!url) {
      vscode.window.showWarningMessage(`You have not entered Drone CI server address`);
      return;
    }

    const label = await vscode.window.showInputBox({
      placeHolder: "Server label",
      prompt: "Please specify Drone CI server label (optional)",
      value: "",
      ignoreFocusOut: true,
    });

    servers = JSON.parse((await this.context.secrets.get("servers")) || "[]");
    let serverExists = servers.find((server: ServerInfo) => server.url === url);

    if (serverExists) {
      vscode.window.showErrorMessage("Server with this URL already exists");
      return;
    }

    const token = await vscode.window.showInputBox({
      placeHolder: "API key",
      prompt: "Specify Drone CI server API key",
      value: "",
      ignoreFocusOut: true,
    });
    if (!token) {
      vscode.window.showWarningMessage(`You have not entered Drone CI server token`);
      return;
    }

    let server: ServerInfo = {
      id: this.servers.length,
      url: url.replace(/\\+$/, ""),
      token: token || "",
      label: label || "",
    };
    servers.push(server);

    await this.context.secrets.store("servers", JSON.stringify(servers));
    vscode.window.showInformationMessage(`You have successfully added a Drone CI server`);
    this.refresh();
  }

  async deleteServer(serverDeleted: vscode.TreeItem) {
    this.servers = this.servers.filter((server: ServerInfo) => server.label !== serverDeleted.label);
    await this.context.secrets.store("servers", JSON.stringify(this.servers));
    this.refresh();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<Server[]> {
    return await this.getServers();
  }

  getFirst() {
    if (this.servers.length > 0) {
      return new Server(this.servers[0]);
    } else {
      return null;
    }
  }

  async getServers() {
    this.servers = JSON.parse((await this.context.secrets.get("servers")) || "[]");
    return this.servers.map((s) => new Server(s));
  }
}

export class Server extends vscode.TreeItem {
  url?: string;
  token?: string;

  constructor(server: ServerInfo) {
    super(server.label, vscode.TreeItemCollapsibleState.None);
    this.url = server.url;
    this.tooltip = server.url;
    this.token = server.token;
    this.iconPath = new vscode.ThemeIcon("server");
  }
}
