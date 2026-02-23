// src/modules/diet/diet.service.spec.ts
import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DietService } from './diet.service';
import { DietRepository, DietRequestListItem } from './diet.repository';
import type { Queue } from 'bullmq';
import type { DietRequest, DietRequestStatus, Prisma } from '@prisma/client';

type CreateRequestResult = {
  id: number;
  status: DietRequest['status'];
  createdAt: Date;
  config: Prisma.JsonObject;
};

const makeCreateRequestResult = (
  overrides: Partial<CreateRequestResult> = {},
): CreateRequestResult => ({
  id: 10,
  status: 'PENDING' as DietRequest['status'],
  createdAt: new Date(),
  config: {} as Prisma.JsonObject,
  ...overrides,
});

const makeDietRequest = (
  overrides: Partial<DietRequest> = {},
): DietRequest => ({
  id: 1,
  userId: 1,
  status: 'PENDING' as DietRequestStatus,
  config: {} as Prisma.JsonObject,
  result: {} as Prisma.JsonObject,
  error: null,
  createdAt: new Date(),
  finishedAt: null,
  ...overrides,
});

type DietRepoMock = {
  createRequest: jest.MockedFunction<
    (userId: number, config: Prisma.JsonObject) => Promise<CreateRequestResult>
  >;
  listRequests: jest.MockedFunction<
    (userId: number) => Promise<DietRequestListItem[]>
  >;
  findByIdAndUserId: jest.MockedFunction<
    (userId: number, id: number) => Promise<DietRequest | null>
  >;
};

type QueueMock = {
  add: jest.MockedFunction<
    (
      name: string,
      data: any,
      opts?: {
        attempts?: number;
        backoff?: { type: string; delay: number };
      },
    ) => Promise<any>
  >;
};

describe('DietService', () => {
  let service: DietService;
  let repo: DietRepoMock;
  let queue: QueueMock;

  beforeEach(async () => {
    repo = {
      createRequest: jest.fn(),
      listRequests: jest.fn(),
      findByIdAndUserId: jest.fn(),
    };

    queue = {
      add: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        DietService,
        { provide: DietRepository, useValue: repo },
        { provide: 'BullQueue_diet', useValue: queue as unknown as Queue },
      ],
    }).compile();

    service = moduleRef.get(DietService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createRequest', () => {
    it('deve criar request no repo e enfileirar o job', async () => {
      const req = makeCreateRequestResult({ id: 123 });
      repo.createRequest.mockResolvedValue(req);
      queue.add.mockResolvedValue({});

      const config = { calories: 2000 };

      await expect(service.createRequest(1, config)).resolves.toEqual(req);

      expect(repo.createRequest).toHaveBeenCalledTimes(1);
      expect(repo.createRequest).toHaveBeenCalledWith(1, config);

      expect(queue.add).toHaveBeenCalledTimes(1);
      expect(queue.add).toHaveBeenCalledWith(
        'process',
        { requestId: 123 },
        { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
      );
    });

    it('deve propagar erro se repo.createRequest falhar e não enfileirar', async () => {
      repo.createRequest.mockRejectedValue(new Error('DB down'));

      await expect(service.createRequest(1, {} as any)).rejects.toThrow(
        'DB down',
      );

      expect(queue.add).not.toHaveBeenCalled();
    });

    it('deve propagar erro se queue.add falhar', async () => {
      repo.createRequest.mockResolvedValue(makeCreateRequestResult({ id: 10 }));
      queue.add.mockRejectedValue(new Error('Redis down'));

      await expect(service.createRequest(1, {} as any)).rejects.toThrow(
        'Redis down',
      );

      expect(repo.createRequest).toHaveBeenCalledTimes(1);
      expect(queue.add).toHaveBeenCalledTimes(1);
    });
  });

  describe('listRequests', () => {
    it('deve chamar repo.listRequests e retornar o resultado', async () => {
      const list = [makeDietRequest({ id: 1 }), makeDietRequest({ id: 2 })];
      repo.listRequests.mockResolvedValue(list);

      await expect(service.listRequests(1)).resolves.toEqual(list);

      expect(repo.listRequests).toHaveBeenCalledTimes(1);
      expect(repo.listRequests).toHaveBeenCalledWith(1);
    });
  });

  describe('getRequest', () => {
    it('deve retornar o request quando existir', async () => {
      const req = makeDietRequest({ id: 5, userId: 1 });
      repo.findByIdAndUserId.mockResolvedValue(req);

      await expect(service.getRequest(1, 5)).resolves.toEqual(req);

      expect(repo.findByIdAndUserId).toHaveBeenCalledTimes(1);
      expect(repo.findByIdAndUserId).toHaveBeenCalledWith(1, 5);
    });

    it('deve lançar NotFoundException quando não existir', async () => {
      repo.findByIdAndUserId.mockResolvedValue(null);

      await expect(service.getRequest(1, 999)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(service.getRequest(1, 999)).rejects.toMatchObject({
        message: 'DietRequest não encontrado.',
      });

      expect(repo.findByIdAndUserId).toHaveBeenCalledTimes(2);
      expect(repo.findByIdAndUserId).toHaveBeenCalledWith(1, 999);
    });
  });
});
