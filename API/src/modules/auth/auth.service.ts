import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AuthRepository } from './auth.repository';

@Injectable()
export class AuthService {
  private readonly saltRounds: number;

  constructor(
    private repo: AuthRepository,
    private jwt: JwtService,
    private config: ConfigService,
  ) {
    const raw = this.config.get<string>('BCRYPT_SALT_ROUNDS', '12');
    const n = Number.parseInt(raw, 10);
    this.saltRounds = Number.isFinite(n) ? n : 12;
  }

  async register(email: string, password: string) {
    const exists = await this.repo.findUserByEmail(email);
    if (exists) throw new ConflictException('Email já cadastrado.');

    const passwordHash = await bcrypt.hash(password, this.saltRounds);
    const user = await this.repo.createUser(email, passwordHash);

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
    });
    return { user, accessToken };
  }

  async login(email: string, password: string) {
    const user = await this.repo.findUserByEmail(email);
    if (!user) throw new UnauthorizedException('Credenciais inválidas.');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Credenciais inválidas.');

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
    });
    return { accessToken };
  }
}
