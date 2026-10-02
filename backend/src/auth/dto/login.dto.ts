import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Captura un correo electrónico válido' })
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
