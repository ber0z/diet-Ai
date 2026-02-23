// src/modules/auth/auth.service.spec.ts
import { Test } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';

import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

type UserEntity = {
  id: number;
  email: string;
  passwordHash: string;
};

type AuthRepoMock = {
  findUserByEmail: jest.MockedFunction<
    (email: string) => Promise<UserEntity | null>
  >;
  createUser: jest.MockedFunction<
    (
      email: string,
      passwordHash: string,
    ) => Promise<Pick<UserEntity, 'id' | 'email'>>
  >;
};

type JwtMock = {
  signAsync: jest.MockedFunction<(payload: any) => Promise<string>>;
};

type ConfigMock = {
  get: jest.MockedFunction<
    (key: string, defaultValue?: string) => string | undefined
  >;
};

describe('AuthService', () => {
  let service: AuthService;
  let repo: AuthRepoMock;
  let jwt: JwtMock;
  let config: ConfigMock;

  beforeEach(async () => {
    repo = {
      findUserByEmail: jest.fn(),
      createUser: jest.fn(),
    };

    jwt = {
      signAsync: jest.fn(),
    };

    config = {
      get: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthRepository, useValue: repo },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor (saltRounds)', () => {
    it('usa BCRYPT_SALT_ROUNDS do config quando é número válido', async () => {
      config.get.mockReturnValue('14');

      const moduleRef = await Test.createTestingModule({
        providers: [
          AuthService,
          { provide: AuthRepository, useValue: repo },
          { provide: JwtService, useValue: jwt },
          { provide: ConfigService, useValue: config },
        ],
      }).compile();

      const svc = moduleRef.get(AuthService);

      (bcrypt.hash as jest.Mock).mockResolvedValue('hash');
      repo.findUserByEmail.mockResolvedValue(null);
      repo.createUser.mockResolvedValue({ id: 1, email: 'a@a.com' });
      jwt.signAsync.mockResolvedValue('token');

      await svc.register('a@a.com', '123');

      expect(bcrypt.hash).toHaveBeenCalledWith('123', 14);
    });

    it('faz fallback para 12 quando config é inválido', async () => {
      config.get.mockReturnValue('abc');

      const moduleRef = await Test.createTestingModule({
        providers: [
          AuthService,
          { provide: AuthRepository, useValue: repo },
          { provide: JwtService, useValue: jwt },
          { provide: ConfigService, useValue: config },
        ],
      }).compile();

      const svc = moduleRef.get(AuthService);

      (bcrypt.hash as jest.Mock).mockResolvedValue('hash');
      repo.findUserByEmail.mockResolvedValue(null);
      repo.createUser.mockResolvedValue({ id: 1, email: 'a@a.com' });
      jwt.signAsync.mockResolvedValue('token');

      await svc.register('a@a.com', '123');

      expect(bcrypt.hash).toHaveBeenCalledWith('123', 12);
    });
  });

  describe('register', () => {
    it('lança ConflictException se email já existe', async () => {
      config.get.mockReturnValue('12');
      repo.findUserByEmail.mockResolvedValue({
        id: 1,
        email: 'a@a.com',
        passwordHash: 'x',
      });

      await expect(service.register('a@a.com', '123')).rejects.toBeInstanceOf(
        ConflictException,
      );

      expect(repo.createUser).not.toHaveBeenCalled();
      expect(jwt.signAsync).not.toHaveBeenCalled();
      expect(bcrypt.hash).not.toHaveBeenCalled();
    });

    it('cria usuário, hasheia senha e retorna accessToken', async () => {
      config.get.mockReturnValue('12');
      repo.findUserByEmail.mockResolvedValue(null);

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      repo.createUser.mockResolvedValue({ id: 10, email: 'a@a.com' });
      jwt.signAsync.mockResolvedValue('token123');

      const res = await service.register('a@a.com', '123');

      expect(bcrypt.hash).toHaveBeenCalledTimes(1);
      expect(bcrypt.hash).toHaveBeenCalledWith('123', 12);

      expect(repo.createUser).toHaveBeenCalledTimes(1);
      expect(repo.createUser).toHaveBeenCalledWith('a@a.com', 'hashed');

      expect(jwt.signAsync).toHaveBeenCalledTimes(1);
      expect(jwt.signAsync).toHaveBeenCalledWith({
        sub: 10,
        email: 'a@a.com',
      });

      expect(res).toEqual({
        user: { id: 10, email: 'a@a.com' },
        accessToken: 'token123',
      });
    });
  });

  describe('login', () => {
    it('lança UnauthorizedException quando usuário não existe', async () => {
      repo.findUserByEmail.mockResolvedValue(null);

      await expect(service.login('a@a.com', '123')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );

      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(jwt.signAsync).not.toHaveBeenCalled();
    });

    it('lança UnauthorizedException quando senha não confere', async () => {
      repo.findUserByEmail.mockResolvedValue({
        id: 10,
        email: 'a@a.com',
        passwordHash: 'hashed',
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login('a@a.com', 'wrong')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );

      expect(bcrypt.compare).toHaveBeenCalledWith('wrong', 'hashed');
      expect(jwt.signAsync).not.toHaveBeenCalled();
    });

    it('retorna accessToken quando credenciais são válidas', async () => {
      repo.findUserByEmail.mockResolvedValue({
        id: 10,
        email: 'a@a.com',
        passwordHash: 'hashed',
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwt.signAsync.mockResolvedValue('token123');

      const res = await service.login('a@a.com', '123');

      expect(bcrypt.compare).toHaveBeenCalledWith('123', 'hashed');

      expect(jwt.signAsync).toHaveBeenCalledWith({
        sub: 10,
        email: 'a@a.com',
      });

      expect(res).toEqual({ accessToken: 'token123' });
    });
  });
});
