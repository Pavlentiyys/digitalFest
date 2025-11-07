const faqs = [
  {
    question: 'Как начисляются баллы?',
    answer: 'Баллы начисляются за участие в каждой из активностей: AR-игра, QR-квесты и квизы. Чем выше ваша активность и правильность ответов, тем больше баллов вы получаете.',
  },
  {
    question: 'Что делать, если я нашел ошибку в приложении?',
    answer: 'Пожалуйста, воспользуйтесь кнопкой "Обратная связь" ниже, чтобы сообщить нам о проблеме. Мы постараемся исправить ее как можно скорее.',
  },
  {
    question: 'Как обменять баллы на призы?',
    answer: 'Экран наград с возможностью обмена баллов будет доступен в конце мероприятия. Следите за обновлениями!',
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

        <div className="mt-12 text-center">
          <h2 className="text-lg font-semibold text-text-primary">Остались вопросы?</h2>
          <p className="text-text-secondary text-xs mt-2">Свяжитесь с нами, и мы поможем.</p>
          <button
            onClick={() => { /* Логика открытия чата с поддержкой */ }}
            className="mt-4 px-6 py-3 text-background font-semibold bg-primary rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Обратная связь
          </button>
        </div>
      </div>
    </div>
  );
}

export default FAQ;
