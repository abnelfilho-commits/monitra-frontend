exports.expandPeople = async page => {
  for (const name of ['Identificação e dados cadastrais', 'Papéis e atuação', 'Instituições vinculadas', 'Acesso à plataforma']) {
    const button = page.getByRole('button', {name, exact:true});
    await button.waitFor();
    if (await button.getAttribute('aria-expanded') === 'false') await button.click();
  }
};
