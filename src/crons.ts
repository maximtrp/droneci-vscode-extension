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
  next: number;
  disabled: boolean;
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

  async addCron() {
    if (!this.data) {
      vscode.window.showInformationMessage("Please select a Drone CI/CD server and a repository");
      return;
    }

    const name = await vscode.window.showInputBox({
      prompt: "Cron job name",
      ignoreFocusOut: true,
    });
    if (!name) {
      return;
    }

    const expr = await vscode.window.showInputBox({
      prompt: "Cron expression",
      ignoreFocusOut: true,
      placeHolder: "@weekly",
      value: "@weekly",
    });
    if (!expr) {
      return;
    }

    const branch = await vscode.window.showInputBox({
      prompt: "Branch name",
      ignoreFocusOut: true,
    });
    if (!branch) {
      return;
    }

    let result = await this.client.createCron(this.data.owner, this.data.repo, {
      name,
      expr,
      branch,
    });
    this.refresh();
  }

  async editCron(cron: Cron) {
    if (!this.data) {
      vscode.window.showInformationMessage("Please select a Drone CI/CD server and a repository");
      return;
    }

    const name = await vscode.window.showInputBox({
      prompt: "Cron job name",
      ignoreFocusOut: true,
      value: cron.name,
    });
    if (!name) {
      return;
    }

    const expr = await vscode.window.showInputBox({
      prompt: "Cron expression",
      ignoreFocusOut: true,
      placeHolder: "0 0 1 * * *",
      value: cron.expr,
    });
    if (!expr) {
      return;
    }

    const branch = await vscode.window.showInputBox({
      prompt: "Branch name",
      ignoreFocusOut: true,
      value: cron.branch,
    });
    if (!branch) {
      return;
    }

    let result = await this.client.updateCron(this.data.owner, this.data.repo, cron.name, {
      name,
      expr,
      branch,
    });
    if (!result) {
      vscode.window.showWarningMessage("Cron job was not updated.");
    } else {
      vscode.window.showInformationMessage("Cron job was updated.");
      this.refresh();
    }
  }

  async triggerCron(cron: Cron) {
    if (this.data) {
      let result = await this.client.executeCron(this.data.owner, this.data.repo, cron.name);
      if (!result) {
        vscode.window.showWarningMessage(
          'Cron job was not triggered. Maybe you need to add "cron" event to trigger section of your pipeline. Refer to https://docs.drone.io/api/builds/build_create/ for more information.'
        );
      } else {
        vscode.window.showInformationMessage("Cron job was triggered.");
        this.refresh();
      }
    }
  }

  async deleteCron(cron: Cron) {
    if (this.data) {
      await this.client.deleteCron(this.data.owner, this.data.repo, cron.name);
      this.refresh();
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
  name?: string;
  expr?: string;
  branch?: string;

  constructor(cron: CronInfo) {
    const label = `${cron.name} on ${cron.branch}`;
    super(label, vscode.TreeItemCollapsibleState.None);
    this.description = cron.expr;
    this.name = cron.name;
    this.expr = cron.expr;
    this.branch = cron.branch;
    this.contextValue = "cron";
    this.tooltip = [label, `\nNext: ${new Date(cron.next * 1000).toLocaleString()}`].join("\n");
    this.iconPath = new vscode.ThemeIcon(
      "clock",
      cron.disabled ? new vscode.ThemeColor("disabledForeground") : undefined
    );
  }
}
