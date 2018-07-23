Vagrant.configure("2") do |config|
  config.vm.box = "hashicorp/precise64"
  config.vm.provision  "shell", path: "provision.sh"
  config.vm.network "public_network", bridge: "vagranttest"
  config.vm.synced_folder "./", "/vagrant" , disabled:true
  config.vm.synced_folder "D:/vagrant/vagranttest/www", "/vagrant/www",smb_username: "Anubhav Meena", smb_password:"Anubh@v0162"
  config.vm.synced_folder "./sites-enabled", "/vagrant/sites-enabled"
end
