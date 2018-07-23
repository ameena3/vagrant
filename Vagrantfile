Vagrant.configure("2") do |config|
  config.vm.box = "hashicorp/precise64"
  config.vm.provision  "shell", path: "provision.sh"
  config.vm.network "forwarded_port" , guest:80 , host:8080, id:"nginx" 
  config.vm.synced_folder "./", "/vagrant" , disabled:true
  config.vm.synced_folder "./www", "/vagrant/www"
  config.vm.synced_folder "./sites-enabled", "/vagrant/sites-enabled"
end
