import { SimpleGit } from 'simple-git';

export interface ChangedFile {
  path: string;
  working_dir: string;
  index: string;
}

export async function getChangedFiles(git: SimpleGit, includeStaged: boolean = true): Promise<ChangedFile[]> {
  const status = await git.status();
  return status.files.filter(file => {
    if (includeStaged) {
      // Include both staged and unstaged changes
      return file.working_dir !== ' ' || file.index !== ' ';
    } else {
      // Include only unstaged changes
      return file.working_dir !== ' ';
    }
  });
}

export async function getStagedFiles(git: SimpleGit): Promise<ChangedFile[]> {
  const status = await git.status();
  return status.files.filter(file => file.index !== ' ');
}

export async function getUnstagedFiles(git: SimpleGit): Promise<ChangedFile[]> {
  const status = await git.status();
  return status.files.filter(file => file.working_dir !== ' ');
} 