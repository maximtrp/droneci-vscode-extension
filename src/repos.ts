import * as vscode from "vscode";
import { dateTimeFmt } from "./helpers";

interface RepoInfo {
  slug: string;
  link: string;
  active: boolean;
  private: boolean;
  trusted: boolean;
  updated: number;
  visibility: string;
  name: string;
  namespace: string;
  baseURL: string | null;
}

export class ReposProvider implements vscode.TreeDataProvider<Repo> {
  private client: any;

  constructor() {}

  private _onDidChangeTreeData: vscode.EventEmitter<Repo | undefined | null | void> = new vscode.EventEmitter<
    Repo | undefined | null | void
  >();
  readonly onDidChangeTreeData: vscode.Event<Repo | undefined | null | void> = this._onDidChangeTreeData.event;

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  setClient(client?: any) {
    if (client !== undefined) {
      this.client = client;
    }
  }

  reset() {
    this.client = null;
    this.refresh();
  }

  getTreeItem(element: vscode.TreeItem) {
    return element;
  }

  async getChildren(): Promise<Repo[]> {
    if (this.client) {
      let repos: RepoInfo[] = [];
      try {
        repos = (await this.client.getRepos()) || [];
        if (repos.length > 0) {
          repos = repos.sort((i, j) => (i.slug < j.slug ? -1 : 1));
          return repos.map(
            (repo) =>
              new Repo({
                ...repo,
                baseURL: this.client._axios.defaults.baseURL,
              })
          );
        }
        return [new None("No repositories found")];
      } catch (e) {
        vscode.window.showWarningMessage(
          "Drone CI server is not available. Check your internet connection, server URL and API key."
        );
        return [new None("Error occurred while retrieving repositories")];
      }
    }
    return [new None("Select server to view repositories")];
  }

  async disableRepo(repo: Repo) {
    const remove: boolean =
      (await vscode.window.showInformationMessage("Do you want to remove this repo?", "Yes", "No")) === "Yes";

    if (this.client) {
      try {
        await this.client.disableRepo(repo.owner, repo.name, remove);
        this.refresh();
      } catch (e) {
        vscode.window.showWarningMessage("Repository was not disabled.");
      }
    }
  }
  async enableRepo(repo: Repo) {
    if (this.client) {
      try {
        await this.client.enableRepo(repo.owner, repo.name);
        this.refresh();
      } catch (e) {
        vscode.window.showWarningMessage("Repository was not enabled.");
      }
    }
  }

  async repairRepo(repo: Repo) {
    if (this.client) {
      try {
        await this.client.repairRepo(repo.owner, repo.name);
        this.refresh();
      } catch (e) {
        vscode.window.showWarningMessage("Repository repair was not run.");
      }
    }
  }
}

class None extends vscode.TreeItem {
  constructor(label: string, state: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None) {
    super(label || "Nothing found", state);
    this.iconPath = new vscode.ThemeIcon(label.startsWith("Error") ? "warning" : "info");
  }
}

export class Repo extends vscode.TreeItem {
  public gitURL?: string;
  public url?: string;
  public settingsURL?: string;
  public deploymentsURL?: string;
  public branchesURL?: string;
  public owner?: string;
  public name?: string;

  constructor(repo: RepoInfo) {
    super(repo.slug, vscode.TreeItemCollapsibleState.None);
    this.tooltip = [
      repo.link,
      `Active: ${repo.active}`,
      `Private: ${repo.private}`,
      `Trusted: ${repo.trusted}`,
      `Visibility: ${repo.visibility}`,
      `Updated: ${dateTimeFmt.format(repo.updated * 1000)}`,
    ].join("\n");
    this.contextValue = "repo" + (repo.active ? "_active" : "_inactive");
    this.name = repo.name;
    this.owner = repo.namespace;
    this.gitURL = repo.link;
    this.settingsURL = `${repo.baseURL}/${repo.slug}/settings`;
    this.deploymentsURL = `${repo.baseURL}/${repo.slug}/deployments`;
    this.branchesURL = `${repo.baseURL}/${repo.slug}/branches`;
    this.url = `${repo.baseURL}/${repo.slug}`;
    this.iconPath = new vscode.ThemeIcon(
      "repo",
      !repo.active ? new vscode.ThemeColor("disabledForeground") : undefined
    );
  }
}
