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
      value: url.replace("https://", ""),
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
      url: url.replace(/\/+$/, ""),
      token: token,
      label: label || url.replace("https://", ""),
    };
    servers.push(server);

    await this.context.secrets.store("servers", JSON.stringify(servers));
    vscode.window.showInformationMessage(`You have successfully added a Drone CI server`);
    this.refresh();
  }

  async editServer(server: Server) {
    let servers: ServerInfo[] = [];

    const url = (
      (await vscode.window.showInputBox({
        placeHolder: "https://drone.domain.name",
        prompt: "Please specify Drone CI server address",
        value: server.url,
        ignoreFocusOut: true,
      })) || ""
    ).replace(/\/+$/, "");

    if (!url) {
      vscode.window.showWarningMessage(`You have not entered Drone CI server address`);
      return;
    } else {
      // Getting existing servers
      servers = JSON.parse((await this.context.secrets.get("servers")) || "[]");
      // Checking if a server with entered URL exists
      let serverExists = servers
        .filter((existingServer: ServerInfo) => server.url !== existingServer.url)
        .find((server: ServerInfo) => server.url === url);
      if (serverExists) {
        vscode.window.showErrorMessage("Server with this URL already exists");
        return;
      }
      // Removing the server that is being editted
      servers = servers.filter((server: ServerInfo) => server.url !== url);
    }

    const label = await vscode.window.showInputBox({
      placeHolder: "Server label",
      prompt: "Please specify Drone CI server label (optional)",
      value: server.label?.toString(),
      ignoreFocusOut: true,
    });

    const token =
      (await vscode.window.showInputBox({
        placeHolder: "API key",
        prompt: "Specify Drone CI server API key",
        ignoreFocusOut: true,
      })) || server.token;

    let serverNew: ServerInfo = {
      id: this.servers.length,
      url: url,
      token: token,
      label: label || url.replace("https://", ""),
    };
    servers.push(serverNew);

    await this.context.secrets.store("servers", JSON.stringify(servers));
    vscode.window.showInformationMessage(`You have successfully updated your Drone CI server`);
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

  getFirst(): vscode.TreeItem | null {
    if (this.servers.length > 0) {
      return new Server(this.servers[0]);
    } else {
      return null;
    }
  }

  async getServers() {
    this.servers = JSON.parse((await this.context.secrets.get("servers")) || "[]");
    if (this.servers.length > 0) {
      return this.servers.map((s) => new Server(s));
    } else {
      vscode.commands.executeCommand("setContext", "hasServerSelected", false);
      return [];
    }
  }
}

export class Server extends vscode.TreeItem {
  url: string;
  token: string;

  constructor(server: ServerInfo) {
    super(server.label, vscode.TreeItemCollapsibleState.None);
    this.url = server.url;
    this.tooltip = server.url;
    this.token = server.token;
    this.iconPath = new vscode.ThemeIcon("server");
  }
}
