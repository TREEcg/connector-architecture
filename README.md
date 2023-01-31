# Connector architecture

This is the connector architecture mono repo, here everything is explained and linked together using GitHub submodules and the GitHub wiki.

Most is explained in the GitHub wiki, but some useful links can be found here: [wiki](https://github.com/TREEcg/connector-architecture/wiki).



## Usage

To initate the repository use the following command:
```sh
git submodule init
git submodule update
```


Currently, all runners have a specific way to start them, see the runner specific documentation.


If you want to add your runners or processors, you can create a new branch/pr and use the following command:

```sh
cd runner # or processor
git submodule add <your github url>
git commit -am "I Added my cool new runner"
```


