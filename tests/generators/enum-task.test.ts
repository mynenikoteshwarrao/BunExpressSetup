import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { makeFakeProject } from '../helpers/fakeProject';
import { createEnum } from '../../src/generators/enum';
import { createTask, addTaskToEnum } from '../../src/generators/task';

let root: string;
beforeEach(async () => { root = await makeFakeProject('express'); });
afterEach(async () => { await fs.remove(root); });

describe('createEnum', () => {
  it('writes a string enum and updates the barrel', async () => {
    const result = await createEnum({
      projectRoot: root, name: 'OrderStatus', enumType: 'string',
      values: [{ key: 'PENDING', value: 'pending' }, { key: 'SHIPPED', value: 'shipped' }],
    });
    const enumPath = path.join(root, 'src', 'enums', 'OrderStatus.ts');
    expect(result.files).toContain(enumPath);
    const content = await fs.readFile(enumPath, 'utf-8');
    expect(content).toContain(`PENDING = 'pending'`);
    expect(content).toContain('export enum OrderStatus');
    const barrel = await fs.readFile(path.join(root, 'src', 'enums', 'index.ts'), 'utf-8');
    expect(barrel).toContain(`export { OrderStatus } from './OrderStatus';`);
  });
  it('writes a number enum without quotes', async () => {
    await createEnum({ projectRoot: root, name: 'Priority', enumType: 'number', values: [{ key: 'LOW', value: 1 }] });
    const content = await fs.readFile(path.join(root, 'src', 'enums', 'Priority.ts'), 'utf-8');
    expect(content).toContain('LOW = 1');
    expect(content).not.toContain(`LOW = '1'`);
  });
  it('rejects invalid enum names and keys', async () => {
    await expect(createEnum({ projectRoot: root, name: 'bad-name', enumType: 'string', values: [{ key: 'A', value: 'a' }] }))
      .rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(createEnum({ projectRoot: root, name: 'Ok', enumType: 'string', values: [{ key: 'bad\nkey', value: 'a' }] }))
      .rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });
  it('throws DUPLICATE when the enum file already exists', async () => {
    await createEnum({ projectRoot: root, name: 'Dup', enumType: 'string', values: [{ key: 'A', value: 'a' }] });
    await expect(createEnum({ projectRoot: root, name: 'Dup', enumType: 'string', values: [{ key: 'A', value: 'a' }] }))
      .rejects.toMatchObject({ code: 'DUPLICATE' });
  });
});

describe('createTask', () => {
  it('adds an enum entry and description', async () => {
    const result = await createTask({ projectRoot: root, name: 'MANAGE_INVENTORY', description: 'Manage inventory' });
    const content = await fs.readFile(path.join(root, 'src', 'enums', 'Task.ts'), 'utf-8');
    expect(content).toContain(`MANAGE_INVENTORY = 'MANAGE_INVENTORY'`);
    expect(content).toContain(`[Task.MANAGE_INVENTORY]: 'Manage inventory'`);
    expect(result.files).toContain(path.join(root, 'src', 'enums', 'Task.ts'));
  });
  it('allows digits in task names', async () => {
    await expect(createTask({ projectRoot: root, name: 'VIEW_S3_FILES', description: 'x' })).resolves.toBeTruthy();
  });
  it('throws DUPLICATE for an existing task', async () => {
    await expect(createTask({ projectRoot: root, name: 'VIEW_USERS', description: 'again' }))
      .rejects.toMatchObject({ code: 'DUPLICATE' });
  });
  it('throws IO_ERROR when Task.ts is missing', async () => {
    await fs.remove(path.join(root, 'src', 'enums', 'Task.ts'));
    await expect(createTask({ projectRoot: root, name: 'NEW_TASK', description: 'x' }))
      .rejects.toMatchObject({ code: 'IO_ERROR' });
  });
  it('rejects multi-line descriptions', async () => {
    await expect(createTask({ projectRoot: root, name: 'OK_TASK', description: 'a\nb' }))
      .rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });
});

describe('addTaskToEnum', () => {
  it('returns false for duplicates without modifying the file', async () => {
    expect(await addTaskToEnum(root, 'VIEW_USERS', 'dup')).toBe(false);
  });
});
