// src/modules/user/users.service.spec.ts
import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './user.service';
import { MeResponse, UsersRepository } from './user.repository';

type UsersRepoMock = {
  findMe: jest.MockedFunction<(userId: number) => Promise<MeResponse | null>>;
  upsertProfile: jest.MockedFunction<
    (userId: number, data: any) => Promise<any>
  >;
};

describe('UsersService', () => {
  let service: UsersService;
  let repo: UsersRepoMock;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: {
            findMe: jest.fn(),
            upsertProfile: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
    repo = moduleRef.get(UsersRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('me', () => {
    it('deve retornar o usuário quando existir', async () => {
      const fakeMe = {
        email: 'a@a.com',
        createdAt: new Date('2026-02-01T00:00:00.000Z'),
        profile: null,
      };

      repo.findMe.mockResolvedValue(fakeMe as any);

      await expect(service.me(1)).resolves.toEqual(fakeMe);
      expect(repo.findMe).toHaveBeenCalledTimes(1);
      expect(repo.findMe).toHaveBeenCalledWith(1);
    });

    it('deve lançar NotFoundException quando usuário não existir', async () => {
      repo.findMe.mockResolvedValue(null);

      await expect(service.me(999)).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.me(999)).rejects.toMatchObject({
        message: 'Usuário não encontrado.',
      });

      expect(repo.findMe).toHaveBeenCalledTimes(2);
      expect(repo.findMe).toHaveBeenCalledWith(999);
    });
  });

  describe('upsertProfile', () => {
    it('deve mapear o dto e chamar o repo (com restrictions quando vier)', async () => {
      const dto = {
        weightKg: 80,
        heightCm: 180,
        goal: 'LOSE_WEIGHT',
        activityLevel: 'MODERATE',
        restrictions: ['sem lactose', 'sem peixe'],
      };

      const fakeProfile = {
        weightKg: 80,
        heightCm: 180,
        goal: dto.goal,
        activityLevel: dto.activityLevel,
        restrictions: dto.restrictions,
        updatedAt: new Date('2026-02-18T00:00:00.000Z'),
      };

      repo.upsertProfile.mockResolvedValue(fakeProfile as any);

      await expect(service.upsertProfile(1, dto as any)).resolves.toEqual(
        fakeProfile,
      );

      expect(repo.upsertProfile).toHaveBeenCalledTimes(1);
      expect(repo.upsertProfile).toHaveBeenCalledWith(1, {
        weightKg: 80,
        heightCm: 180,
        goal: dto.goal,
        activityLevel: dto.activityLevel,
        restrictions: dto.restrictions,
      });
    });

    it('deve enviar restrictions como undefined quando dto não tiver restrictions', async () => {
      const dto = {
        weightKg: 75,
        heightCm: 175,
        goal: 'MAINTAIN',
        activityLevel: 'LIGHT',
      };

      const fakeProfile = {
        weightKg: 75,
        heightCm: 175,
        goal: dto.goal,
        activityLevel: dto.activityLevel,
        restrictions: null,
        updatedAt: new Date('2026-02-18T00:00:00.000Z'),
      };

      repo.upsertProfile.mockResolvedValue(fakeProfile as any);

      await expect(service.upsertProfile(2, dto as any)).resolves.toEqual(
        fakeProfile,
      );

      expect(repo.upsertProfile).toHaveBeenCalledTimes(1);
      expect(repo.upsertProfile).toHaveBeenCalledWith(2, {
        weightKg: 75,
        heightCm: 175,
        goal: dto.goal,
        activityLevel: dto.activityLevel,
        restrictions: undefined,
      });
    });
  });
});
