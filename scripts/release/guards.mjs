export function validateReleaseSource({ remote, expectedRepo, head, main, dirty, projectId, expectedProject }) {
  const accepted = [`git@github.com:${expectedRepo}.git`, `https://github.com/${expectedRepo}.git`, `https://github.com/${expectedRepo}`];
  if (!accepted.includes(remote)) throw Error('origin 不是约定的 GitHub 仓库，停止发布。');
  if (dirty) throw Error('存在未提交修改。请先通过 PR 合并，再发布 main。');
  if (!/^[a-f0-9]{40}$/.test(head) || head !== main) throw Error('只能发布刚从 GitHub 核实的 main，不能发布未合并分支或旧提交。');
  if (projectId !== expectedProject) throw Error('Sites 项目不一致，停止发布以保护原账号与数据库。');
  return head;
}
