const faqs = [
  {
    question: 'Как начисляются баллы?',
    answer: 'Баллы начисляются за участие в каждой из активностей: AR-игра, QR-квесты и квизы. Чем выше ваша активность и правильность ответов, тем больше баллов вы получаете.',
  },
  {
    question: 'Что делать, если возникла ошибка или проблема?',
    answer: 'Если обнаружили баг или что-то не работает — отправьте сообщение в Telegram пользователю @DigitalFest (чат поддержки мероприятия). Опишите коротко проблему и мы постараемся помочь как можно быстрее.',
  },
  {
    question: 'Как будут выдаваться призы?',
    answer: 'После 14:00 откроется рейтинг с итоговыми местами участников. Первые 3 места получат награды. Организаторы свяжутся с победителями и подскажут, куда подойти для получения приза.',
  },
];

function FAQ() {
  return (
    <div className="p-6 bg-background min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-text-primary mb-8">Часто задаваемые вопросы (FAQ)</h1>
        
        <div className="space-y-6">
          {faqs.map((faq, index) => (
            <div key={index} className="bg-surface border border-border-color p-6 rounded-xl shadow-lg">
              <h2 className="text-md font-semibold text-primary">{faq.question}</h2>
              <p className="text-text-secondary text-xs mt-2">{faq.answer}</p>
            </div>
          ))}
        </div>

        {/* Блок обратной связи удален по запросу */}
      </div>
    </div>
  );
}

export default FAQ;
