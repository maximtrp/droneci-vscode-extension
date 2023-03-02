import * as vscode from "vscode";

interface RepoInfo {
  baseURL?: string;
  owner: string;
  repo: string;
}

interface CronInfo {
  name: string;
  branch: string;
  expr: string;
}

export class CronsProvider implements vscode.TreeDataProvider<Cron | None> {
  private client: any | null = null;
  public data: RepoInfo | null = null;

  constructor() {
    this.client = null;
    this.data = null;
  }

  private _onDidChangeTreeData: vscode.EventEmitter<Cron | undefined | null | void> = new vscode.EventEmitter<
    Cron | undefined | null | void
  >();
  readonly onDidChangeTreeData: vscode.Event<Cron | undefined | null | void> = this._onDidChangeTreeData.event;

  refresh(client?: any, data?: RepoInfo) {
    if (client) {
      this.client = client;
    }
    if (data) {
      this.data = data;
    }
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem) {
    return element;
  }

  async getChildren() {
    if (this.client && this.data) {
      let crons = (await this.client.getCrons(this.data.owner, this.data.repo)) || [];
      const results = crons.map((cron: CronInfo) => new Cron(cron));
      if (results.length > 0) {
        return results;
      } else {
        return [new None("No cron jobs found")];
      }
    } else {
      return [new None("Select a server and a repository to view cron jobs")];
    }
  }

  gotoCronPage() {
    if (this.client && this.data) {
      vscode.env.openExternal(
        vscode.Uri.parse(`${this.client._axios.defaults.baseURL}/${this.data.owner}/${this.data.repo}/settings/cron`)
      );
    } else {
      vscode.window.showInformationMessage("Please select Drone server and repository to view cron jobs");
    }
  }
}

class None extends vscode.TreeItem {
  constructor(label: string) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon("info");
  }
}

class Cron extends vscode.TreeItem {
  constructor(cron: CronInfo) {
    const label = `${cron.name} on ${cron.branch}`;
    super(label, vscode.TreeItemCollapsibleState.None);
    this.description = cron.expr;
    this.iconPath = new vscode.ThemeIcon("key");
  }
}
