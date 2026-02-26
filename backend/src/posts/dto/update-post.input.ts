import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class UpdatePostInput {
  @Field({ nullable: true })
  content?: string;

  // --- РАСКОММЕНТИРОВАТЬ И УБЕДИТЬСЯ В ПРАВИЛЬНОСТИ ТИПА ---
  @Field(() => [String], { nullable: 'itemsAndList' }) // <--- ВОТ ЭТА СТРОКА
  images?: string[];
  // --------------------------------------------------------
  
  @Field(() => Boolean, { nullable: true })
  endPoll?: boolean;
  
  @Field(() => Boolean, { nullable: true })
  commentsDisabled?: boolean;
}