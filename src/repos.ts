import * as vscode from "vscode";

interface RepoInfo {
  slug: string;
  link: string;
  active: boolean;
  private: boolean;
  trusted: boolean;
  updated: number;
  visibility: string;

  baseURL: string | null;
}

export class ReposProvider implements vscode.TreeDataProvider<Repo> {
  client: any;

  constructor() {}

  private _onDidChangeTreeData: vscode.EventEmitter<Repo | undefined | null | void> = new vscode.EventEmitter<
    Repo | undefined | null | void
  >();
  readonly onDidChangeTreeData: vscode.Event<Repo | undefined | null | void> = this._onDidChangeTreeData.event;

  refresh(client?: any): void {
    if (client) {
      this.client = client;
    }
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem) {
    return element;
  }

  async getChildren(): Promise<Repo[]> {
    if (this.client) {
      let repos: RepoInfo[] = (await this.client.getRepos()) || [];
      console.log(repos);
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
    }
    return [new None("Select server to view repositories")];
  }
}

class None extends vscode.TreeItem {
  constructor(label: string, state: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None) {
    super(label || "Nothing found", state);
    this.iconPath = new vscode.ThemeIcon("info");
  }
}

export class Repo extends vscode.TreeItem {
  public gitURL?: string;
  public url?: string;
  public settingsURL?: string;
  public deploymentsURL?: string;
  public branchesURL?: string;

  constructor(repo: RepoInfo) {
    super(repo.slug, vscode.TreeItemCollapsibleState.None);
    this.tooltip = [
      repo.link,
      `Active: ${repo.active}`,
      `Private: ${repo.private}`,
      `Trusted: ${repo.trusted}`,
      `Visibility: ${repo.visibility}`,
      `Updated: ${new Date(repo.updated * 1000).toISOString()}`,
    ].join("\n");
    this.contextValue = "repo";
    this.iconPath = new vscode.ThemeIcon("repo");
    this.gitURL = repo.link;
    this.settingsURL = `${repo.baseURL}/${repo.slug}/settings`;
    this.deploymentsURL = `${repo.baseURL}/${repo.slug}/deployments`;
    this.branchesURL = `${repo.baseURL}/${repo.slug}/branches`;
    this.url = `${repo.baseURL}/${repo.slug}`;
  }
}
