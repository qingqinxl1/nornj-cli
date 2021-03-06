'use strict';

const exec = require('child_process').exec;
const ora = require('ora');
const git = require('git-exec');
const co = require('co');
const prompt = require('co-prompt');
const chalk = require('chalk');
const fs = require('fs');
const {
  getTemplatePath,
  renderFile,
  renderAppendFile
} = require('./utils');
const nj = require('nornj').default;
const includeParser = require('nornj/tools/includeParser');
require('./nj.config');
const inquirer = require('inquirer');

module.exports = () => {
  let pageName;
  const pkg = require(`${process.cwd()}/package.json`);
  const templateType = pkg.templateType ? pkg.templateType : pkg.njCliConfig.templateType;
  const templateMultiPage = templateType == 'multi-page';

  if (templateMultiPage) {
    co(function*() {
      pageName = yield prompt('Page Name: ');
      const useLayout = (yield prompt('Do you need to use layout on server side ? (Y/N)')).trim().toLowerCase() === 'y';

      //html files
      renderFile(`./templates/resources/htmls/newPage.html`, `./resources/htmls/${pageName}.html`, {
        useLayout,
        pageName
      });

      //server files
      renderFile(`./templates/server/routes/newPage.js`, `./server/routes/${pageName}.js`);
      renderFile(`./server/app.js`, null, {
        delimiters: {
          start: '/{',
          end: '}/'
        },
        pages: nj.render(fs.readFileSync(`./templates/server/app.js`, 'utf-8').trim(), { pageName })
      });
      renderFile(`./server/devApp.js`, null, {
        delimiters: {
          start: '/{',
          end: '}/'
        },
        pages: nj.render(fs.readFileSync(`./templates/server/devApp.js`, 'utf-8').trim(), { pageName })
      });

      //page resource files
      renderFile(`./templates/src/pages/newPage/container.js`, `./src/pages/${pageName}/container.js`, { pageName });
      renderFile(`./templates/src/pages/newPage/newPage.m.less`, `./src/pages/${pageName}/${pageName}.m.less`);
      renderFile(`./templates/src/pages/newPage/newPage.t.html`, `./src/pages/${pageName}/${pageName}.t.html`);

      //store files
      renderFile(`./templates/src/stores/newPageStore.js`, `./src/stores/${nj.filters.pascal(pageName)}Store.js`, { pageName });

      console.log(chalk.green('\n √ created page finished !'));
      process.exit();
    });
  } else {
    inquirer.prompt([{
      type: 'list',
      name: 'pageType',
      message: 'What type of page do you want to generate ?',
      choices: [
        'default',
        'chart',
        'empty',
      ],
    }]).then(answers => {
      co(function*() {
        const pageType = answers.pageType === 'default' ? '' : nj.filters.pascal(answers.pageType);
        pageName = process.argv[3];
        if (pageName == null) {
          pageName = yield prompt('Page Name: ');
        }

        //server route files
        renderFile(`./templates/server/routes/newPage${pageType}.js`, `./server/routes/${pageName}.js`);
        renderFile(`./server/app.js`, null, {
          delimiters: {
            start: '/{',
            end: '}/'
          },
          pages: nj.render(fs.readFileSync(`./templates/server/app.js`, 'utf-8').trim(), { pageName })
        });

        //page resource files
        renderFile(`./templates/src/web/pages/newPage${pageType}/newPage.js`, `./src/web/pages/${pageName}/${pageName}.js`, { pageName });
        renderFile(`./templates/src/web/pages/newPage${pageType}/newPage.m.scss`, `./src/web/pages/${pageName}/${pageName}.m.scss`, { pageName });
        renderFile(`./templates/src/web/pages/newPage${pageType}/newPage.t.html`, `./src/web/pages/${pageName}/${pageName}.t.html`, { pageName });

        //store files
        renderFile(`./templates/src/stores/pages/newPageStore${pageType}.js`, `./src/stores/pages/${pageName}Store.js`, { pageName });
        const tmplsRootStore = includeParser(fs.readFileSync(`./templates/src/stores/rootStore.js`, 'utf-8'), null, nj.tmplRule, true);
        renderFile(`./src/stores/rootStore.js`, null, {
          delimiters: {
            start: '/{',
            end: '}/'
          },
          importStore: nj.render(tmplsRootStore.importStore.trim(), { pageName }),
          pageStore: nj.render(tmplsRootStore.pageStore.trim(), { pageName })
        });

        //router config
        const tmplsRoutesWeb = includeParser(fs.readFileSync(`./templates/routes-web.js`, 'utf-8'), null, nj.tmplRule, true);
        renderFile(`./routes-web.js`, null, {
          delimiters: {
            start: '/{',
            end: '}/'
          },
          importLoadPage: nj.render(tmplsRoutesWeb.importLoadPage.trim(), { pageName }),
          loadPage: nj.render(tmplsRoutesWeb.loadPage.trim(), { pageName }),
          pageComponent: nj.render(tmplsRoutesWeb.pageComponent.trim(), { pageName }),
          route: nj.render(tmplsRoutesWeb.route.trim(), { pageName }),
          clear: /<!--__extraComment__-->/g
        });

        console.log(chalk.green('\n √ created page finished !'));
        process.exit();
      });
    });
  }
};