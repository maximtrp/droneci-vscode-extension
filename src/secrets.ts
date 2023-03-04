import * as vscode from "vscode";

interface RepoInfo {
  baseURL?: string;
  owner: string;
  repo: string;
}

interface SecretInfo {
  name: string;
}

export class SecretsProvider implements vscode.TreeDataProvider<Secret | None> {
  private client: any | null = null;
  public data: RepoInfo | null = null;

  constructor() {
    this.client = null;
    this.data = null;
  }

  private _onDidChangeTreeData: vscode.EventEmitter<Secret | undefined | null | void> = new vscode.EventEmitter<
    Secret | undefined | null | void
  >();
  readonly onDidChangeTreeData: vscode.Event<Secret | undefined | null | void> = this._onDidChangeTreeData.event;

  async addSecret() {
    if (!this.client || !this.data) {
      vscode.window.showInformationMessage("Please select a Drone CI/CD server and a repository");
      return;
    }

    const name = await vscode.window.showInputBox({
      prompt: "Secret name",
      ignoreFocusOut: true,
    });
    if (!name) {
      return;
    }

    const data = await vscode.window.showInputBox({
      prompt: "Secret value",
      ignoreFocusOut: true,
    });
    if (!data) {
      return;
    }

    let pullRequest: boolean =
      (await vscode.window.showInformationMessage("Allow pull requests?", "Yes", "No")) === "Yes";

    // eslint-disable-next-line @typescript-eslint/naming-convention
    await this.client.createSecret(this.data.owner, this.data.repo, { name, data, pull_request: pullRequest });
    this.refresh();
  }

  async editSecret(secret: Secret) {
    if (!this.data) {
      vscode.window.showInformationMessage("Please select a Drone CI/CD server and a repository");
      return;
    }

    const data = await vscode.window.showInputBox({
      prompt: "Secret value",
      ignoreFocusOut: true,
    });
    if (!data) {
      return;
    }

    let pullRequest: boolean =
      (await vscode.window.showInformationMessage("Allow pull requests?", "Yes", "No")) === "Yes";

    await this.client.updateSecret(this.data.owner, this.data.repo, secret.label, {
      data,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      pull_request: pullRequest,
    });
    this.refresh();
  }

  async deleteSecret(secret: Secret) {
    if (this.data) {
      await this.client.deleteSecret(this.data.owner, this.data.repo, secret.label);
      this.refresh();
    }
  }

  refresh(client?: any, data?: RepoInfo | null) {
    if (client !== undefined) {
      this.client = client;
    }
    if (data !== undefined) {
      this.data = data;
    }
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem) {
    return element;
  }

  async getChildren() {
    if (this.client && this.data) {
      let secrets = await this.client.getSecrets(this.data.owner, this.data.repo);
      const results = (secrets || []).map((secret: SecretInfo) => new Secret(secret));
      if (results.length > 0) {
        return results;
      } else {
        return [new None("No secrets found")];
      }
    } else {
      return [new None("Select server and repository to view secrets")];
    }
  }

  gotoSecretsPage() {
    if (this.client && this.data) {
      vscode.env.openExternal(
        vscode.Uri.parse(`${this.client._axios.defaults.baseURL}/${this.data.owner}/${this.data.repo}/settings/secrets`)
      );
    } else {
      vscode.window.showInformationMessage("Please select Drone server and repository to view secrets");
    }
  }
}

class None extends vscode.TreeItem {
  constructor(label: string) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.contextValue = "none";
    this.iconPath = new vscode.ThemeIcon("info");
  }
}

class Secret extends vscode.TreeItem {
  constructor(secret: SecretInfo) {
    super(secret.name, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon("key");
  }
}
